-- TRAIL Academy — commerce (Phase C)
-- Stripe is the source of truth for payment. These functions apply *verified* Stripe events to our
-- records atomically: the idempotency record and every effect commit or roll back together.
--
-- Access revocation policy (to be confirmed by legal review; implemented as follows):
--   * full refund        → entitlements granted by that order are revoked
--   * partial refund     → access is kept, order marked partially_refunded
--   * dispute opened     → access suspended (revoked) while the dispute is open
--   * dispute won        → order returns to paid and access is restored
--   * dispute lost       → access stays revoked
--   * expired/failed/canceled payment → no access was ever granted

alter table orders add column discount_cents integer not null default 0 check (discount_cents >= 0);
alter table orders add column paid_at timestamptz;
alter table profiles add column stripe_customer_id text unique;
create unique index payments_one_per_intent on payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index order_items_order_idx on order_items(order_id);

-- ───────── Order creation (service role only) ─────────
-- Validates purchasability rules in one place: product active, active price, every covered course
-- published, not already fully owned. Returns what the checkout session needs.
create function create_checkout_order(p_user uuid, p_product_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_product products%rowtype; v_price prices%rowtype; v_order uuid; v_months smallint; v_item uuid;
begin
  select * into v_product from products where slug = p_product_slug;
  if not found or not v_product.active then raise exception 'product_unavailable'; end if;
  if v_product.kind = 'enterprise_pack' then raise exception 'not_purchasable_online'; end if;

  select * into v_price from prices where product_id = v_product.id and active;
  if not found then raise exception 'product_unavailable'; end if;
  if v_price.amount_cents is null then raise exception 'quotation_only'; end if;
  if v_price.currency <> 'EUR' then raise exception 'unsupported_currency'; end if;

  if not exists (select 1 from product_course_access where product_id = v_product.id) then raise exception 'product_unavailable'; end if;
  if exists (select 1 from product_course_access a join courses c on c.id = a.course_id where a.product_id = v_product.id and c.status <> 'published') then
    raise exception 'not_published';
  end if;

  -- Never charge again for content the user already holds.
  if not exists (
    select 1 from product_course_access a
    where a.product_id = v_product.id
      and not exists (select 1 from entitlements e where e.user_id = p_user and e.course_id = a.course_id and e.status = 'active' and e.expires_at > now())
  ) then raise exception 'already_owned'; end if;

  v_months := coalesce(v_product.access_months, 12);
  insert into orders (user_id, status, total_cents, currency) values (p_user, 'pending', v_price.amount_cents, v_price.currency) returning id into v_order;
  insert into order_items (order_id, product_id, quantity, unit_amount_cents, access_months)
    values (v_order, v_product.id, 1, v_price.amount_cents, v_months) returning id into v_item;

  return jsonb_build_object('order_id', v_order, 'amount_cents', v_price.amount_cents, 'currency', v_price.currency,
    'tax_inclusive', v_price.tax_inclusive, 'title', v_product.title, 'access_months', v_months);
end $$;

create function attach_checkout_session(p_order uuid, p_session text) returns void
language sql security definer set search_path = public as $$
  update orders set stripe_checkout_session_id = p_session where id = p_order and status = 'pending'
$$;

-- ───────── Stripe event processing ─────────
-- p_data is a normalised, minimal projection built by application code after signature verification:
--   order_id, session_id, payment_intent_id, charge_id, payment_status, amount_total, amount_tax,
--   amount_discount, currency, customer_id, invoice_id, amount_refunded, amount_captured, dispute_status
create function process_stripe_event(p_event_id text, p_type text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype; v_order_id uuid; v_pi text := p_data->>'payment_intent_id';
  v_status text := 'ignored'; v_new_paid boolean := false;
  v_refunded integer; v_captured integer;
begin
  insert into processed_webhook_events (stripe_event_id, event_type) values (p_event_id, p_type) on conflict do nothing;
  if not found then return jsonb_build_object('status', 'duplicate'); end if;

  v_order_id := nullif(p_data->>'order_id', '')::uuid;
  if v_order_id is not null then select * into o from orders where id = v_order_id for update;
  elsif v_pi is not null then select * into o from orders where stripe_payment_intent_id = v_pi for update;
  end if;
  if o.id is null then return jsonb_build_object('status', 'unknown_order'); end if;

  -- Checkout events must reference the session we created for this order (blocks cross-order spoofing).
  if p_type like 'checkout.session.%' and o.stripe_checkout_session_id is distinct from p_data->>'session_id' then
    return jsonb_build_object('status', 'session_mismatch', 'order_id', o.id);
  end if;

  if p_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded') then
    if p_data->>'currency' is distinct from lower(o.currency) then return jsonb_build_object('status', 'currency_mismatch', 'order_id', o.id); end if;
    if p_type = 'checkout.session.completed' and p_data->>'payment_status' = 'unpaid' then
      update orders set stripe_payment_intent_id = coalesce(v_pi, stripe_payment_intent_id) where id = o.id;
      v_status := 'awaiting_payment';
    elsif o.status in ('pending', 'failed') then
      update orders set status = 'paid', paid_at = now(), total_cents = (p_data->>'amount_total')::int,
        tax_cents = coalesce((p_data->>'amount_tax')::int, 0), discount_cents = coalesce((p_data->>'amount_discount')::int, 0),
        stripe_payment_intent_id = coalesce(v_pi, stripe_payment_intent_id), stripe_invoice_id = coalesce(p_data->>'invoice_id', stripe_invoice_id)
      where id = o.id;
      insert into payments (order_id, stripe_payment_intent_id, amount_cents, status)
        values (o.id, v_pi, (p_data->>'amount_total')::int, 'succeeded') on conflict (stripe_payment_intent_id) where stripe_payment_intent_id is not null do nothing;
      if p_data->>'customer_id' is not null then update profiles set stripe_customer_id = p_data->>'customer_id' where id = o.user_id and stripe_customer_id is null; end if;
      perform provision_order(o.id);
      v_status := 'paid'; v_new_paid := true;
    else
      v_status := 'already_' || o.status;
    end if;

  elsif p_type in ('checkout.session.async_payment_failed', 'payment_intent.payment_failed') then
    if o.status = 'pending' then update orders set status = 'failed' where id = o.id; v_status := 'failed'; else v_status := 'already_' || o.status; end if;

  elsif p_type = 'checkout.session.expired' then
    if o.status = 'pending' then update orders set status = 'canceled' where id = o.id; v_status := 'canceled'; else v_status := 'already_' || o.status; end if;

  elsif p_type = 'charge.refunded' then
    v_refunded := (p_data->>'amount_refunded')::int; v_captured := (p_data->>'amount_captured')::int;
    update payments set refunded_cents = greatest(refunded_cents, v_refunded), stripe_charge_id = coalesce(stripe_charge_id, p_data->>'charge_id') where order_id = o.id;
    if o.status in ('paid', 'partially_refunded', 'disputed') then
      if v_refunded >= v_captured then
        update orders set status = 'refunded' where id = o.id;
        update entitlements set status = 'revoked' where status = 'active' and order_item_id in (select id from order_items where order_id = o.id);
        v_status := 'refunded';
      else
        update orders set status = 'partially_refunded' where id = o.id;
        v_status := 'partially_refunded';
      end if;
    end if;

  elsif p_type = 'charge.dispute.created' then
    if o.status in ('paid', 'partially_refunded') then
      update orders set status = 'disputed' where id = o.id;
      update entitlements set status = 'revoked' where status = 'active' and order_item_id in (select id from order_items where order_id = o.id);
      v_status := 'disputed';
    end if;

  elsif p_type = 'charge.dispute.closed' then
    if o.status = 'disputed' and p_data->>'dispute_status' = 'won' then
      update orders set status = 'paid' where id = o.id;
      perform provision_order(o.id);
      v_status := 'dispute_won';
    elsif o.status = 'disputed' then
      v_status := 'dispute_lost';
    end if;
  end if;

  return jsonb_build_object('status', v_status, 'order_id', o.id, 'user_id', o.user_id, 'newly_paid', v_new_paid);
end $$;

revoke all on function create_checkout_order(uuid, text), attach_checkout_session(uuid, text), process_stripe_event(text, text, jsonb) from public, anon, authenticated;
grant execute on function create_checkout_order(uuid, text), attach_checkout_session(uuid, text), process_stripe_event(text, text, jsonb) to service_role;
