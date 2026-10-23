-- TRAIL Academy — administration (Phase D)
-- Every privileged operation is a function that re-checks is_admin() itself, so it is safe even if the
-- server layer is bypassed. Financial and content tables are audited by trigger.

create function require_admin() returns void language plpgsql stable security definer set search_path = public as $$
begin if not is_admin() then raise exception 'admin only'; end if; end $$;

alter table coupons add column stripe_promotion_code_id text unique;

-- ───────── Interest / newsletter sign-ups (no payment, explicit consent) ─────────
-- Written only by the server (service role) after validation, rate limiting and a consent checkbox.
create table interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  kind text not null check (kind in ('course_launch', 'newsletter')),
  course_slug text,
  consent_policy_version text not null,
  created_at timestamptz not null default now(),
  unique (email, kind, course_slug)
);
alter table interest_signups enable row level security;
create policy interest_signups_admin_read on interest_signups for select using (is_admin());
create policy interest_signups_admin_delete on interest_signups for delete using (is_admin());

-- ───────── Audit trail ─────────
create function audit_row_change() returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into audit_logs (actor_id, action, entity, entity_id, details) values (
    auth.uid(), tg_op, tg_table_name, coalesce(r->>'id', r->>'key', r->>'code', r->>'stripe_event_id'),
    case tg_op when 'DELETE' then jsonb_build_object('old', to_jsonb(old))
               when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
               else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['courses','course_prerequisites','learning_paths','learning_path_courses','chapters','lessons','lesson_resources',
    'quizzes','quiz_questions','quiz_options','assignments','products','prices','coupons','orders','payments','entitlements',
    'testimonials','faq_items','blog_posts','pages','page_sections','system_settings','assignment_submissions'] loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row_change()', 'audit_' || t, t);
  end loop;
end $$;

-- ───────── Prerequisites cannot form cycles ─────────
create function prevent_prereq_cycle() returns trigger language plpgsql as $$
begin
  if exists (
    with recursive r(id) as (select new.prerequisite_id union select cp.prerequisite_id from course_prerequisites cp join r on cp.course_id = r.id)
    select 1 from r where id = new.course_id
  ) then raise exception 'prerequisite cycle'; end if;
  return new;
end $$;
create trigger course_prerequisites_no_cycle before insert or update on course_prerequisites for each row execute function prevent_prereq_cycle();

-- ───────── Publishing ─────────
create function course_readiness(p_course uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare issues jsonb := '[]'::jsonb; r record;
begin
  perform require_admin();
  if not exists (select 1 from lessons where course_id = p_course and content_status = 'published') then
    issues := issues || jsonb_build_object('code', 'no_published_lessons');
  end if;
  for r in select title from lessons where course_id = p_course and content_status = 'published'
           and video_asset_id is null and coalesce(btrim(body_md), '') = '' loop
    issues := issues || jsonb_build_object('code', 'lesson_without_content', 'detail', r.title);
  end loop;
  if exists (select 1 from courses where id = p_course and cardinality(outcomes) = 0) then issues := issues || jsonb_build_object('code', 'no_outcomes'); end if;
  for r in select q.title from quizzes q where q.course_id = p_course and not exists (select 1 from quiz_questions qq where qq.quiz_id = q.id) loop
    issues := issues || jsonb_build_object('code', 'quiz_without_questions', 'detail', r.title);
  end loop;
  for r in select qq.prompt from quiz_questions qq join quizzes q on q.id = qq.quiz_id
           where q.course_id = p_course and qq.kind <> 'free_text'
             and (select count(*) from quiz_options o where o.question_id = qq.id and o.is_correct) = 0 loop
    issues := issues || jsonb_build_object('code', 'question_without_correct_option', 'detail', r.prompt);
  end loop;
  return issues;
end $$;

create function publish_course(p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
declare issues jsonb;
begin
  perform require_admin();
  issues := course_readiness(p_course);
  if jsonb_array_length(issues) > 0 then raise exception 'not_ready: %', issues::text; end if;
  update courses set status = 'published' where id = p_course;
end $$;

-- Unpublishing also closes every offer that includes the course, so nothing unpublished can be sold.
-- Existing learners keep their entitlements.
create function unpublish_course(p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update courses set status = 'coming_soon' where id = p_course;
  update products set active = false where id in (select product_id from product_course_access where course_id = p_course);
end $$;

-- Activating an offer requires every included course to be published (and a price to exist).
create function set_product_active(p_product uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_active then
    if exists (select 1 from product_course_access a join courses c on c.id = a.course_id where a.product_id = p_product and c.status <> 'published')
       or not exists (select 1 from product_course_access where product_id = p_product) then
      raise exception 'not_published';
    end if;
    if not exists (select 1 from prices where product_id = p_product and active and amount_cents is not null) then raise exception 'no_price'; end if;
  end if;
  update products set active = p_active where id = p_product;
end $$;

-- Price history is kept: the previous price is deactivated, never edited. Past orders hold their own snapshot.
create function set_product_price(p_product uuid, p_amount_cents integer, p_tax_inclusive boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_amount_cents is not null and p_amount_cents < 0 then raise exception 'invalid_amount'; end if;
  if not exists (select 1 from products where id = p_product) then raise exception 'product not found'; end if;
  update prices set active = false where product_id = p_product and active;
  insert into prices (product_id, amount_cents, tax_inclusive) values (p_product, p_amount_cents, p_tax_inclusive);
end $$;

-- ───────── Ordering ─────────
create function reorder_chapters(p_course uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if (select coalesce(array_agg(id order by id), '{}') from chapters where course_id = p_course) is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_ids) x) then
    raise exception 'ids mismatch';
  end if;
  update chapters c set position = o.ord from unnest(p_ids) with ordinality o(id, ord) where c.id = o.id;
end $$;

create function reorder_lessons(p_chapter uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if (select coalesce(array_agg(id order by id), '{}') from lessons where chapter_id = p_chapter) is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_ids) x) then
    raise exception 'ids mismatch';
  end if;
  update lessons l set position = o.ord from unnest(p_ids) with ordinality o(id, ord) where l.id = o.id;
end $$;

create function set_path_courses(p_path uuid, p_course_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if (select count(*) from unnest(p_course_ids) x) <> (select count(distinct x) from unnest(p_course_ids) x) then raise exception 'duplicate courses'; end if;
  if exists (select 1 from unnest(p_course_ids) x where not exists (select 1 from courses where id = x)) then raise exception 'unknown course'; end if;
  delete from learning_path_courses where path_id = p_path;
  insert into learning_path_courses (path_id, course_id, position) select p_path, x, ord from unnest(p_course_ids) with ordinality o(x, ord);
  -- Keep the sellable product's included courses in sync with the path.
  delete from product_course_access where product_id in (select id from products where path_id = p_path);
  insert into product_course_access (product_id, course_id) select p.id, x from products p, unnest(p_course_ids) x where p.path_id = p_path;
end $$;

-- ───────── Learner access and review ─────────
create function admin_grant_access(p_user uuid, p_course uuid, p_months integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_months is null or p_months < 1 or p_months > 36 then raise exception 'invalid_months'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  insert into entitlements (user_id, course_id, expires_at) values (p_user, p_course, now() + make_interval(months => p_months))
  on conflict (user_id, course_id) do update
    set expires_at = greatest(entitlements.expires_at, excluded.expires_at), status = 'active';
  insert into audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'admin_grant_access', 'entitlements', p_user::text, jsonb_build_object('course_id', p_course, 'months', p_months, 'reason', p_reason));
end $$;

create function admin_revoke_access(p_user uuid, p_course uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update entitlements set status = 'revoked' where user_id = p_user and course_id = p_course;
  insert into audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'admin_revoke_access', 'entitlements', p_user::text, jsonb_build_object('course_id', p_course, 'reason', p_reason));
end $$;

create function review_submission(p_id uuid, p_status submission_status, p_feedback text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status = 'submitted' then raise exception 'invalid_status'; end if;
  if p_status = 'revision_requested' and coalesce(btrim(p_feedback), '') = '' then raise exception 'feedback_required'; end if;
  update assignment_submissions set status = p_status, instructor_feedback = nullif(btrim(p_feedback), ''), reviewed_at = now() where id = p_id;
  if not found then raise exception 'submission not found'; end if;
end $$;

-- Explicit audit entries for actions that happen outside our tables (e.g. a refund requested at Stripe).
create function log_admin_action(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  insert into audit_logs (actor_id, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'));
end $$;

-- ───────── Dashboard metrics ─────────
create function admin_metrics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(p_days, 1)); r jsonb;
begin
  perform require_admin();
  select jsonb_build_object(
    'since', since,
    'gross_cents', coalesce((select sum(amount_cents) from payments where created_at >= since), 0),
    'refunded_cents', coalesce((select sum(refunded_cents) from payments where created_at >= since), 0),
    'net_cents', coalesce((select sum(amount_cents - refunded_cents) from payments where created_at >= since), 0),
    'purchases', (select count(*) from orders where paid_at >= since),
    'pending_orders', (select count(*) from orders where status = 'pending' and created_at >= since),
    'failed_orders', (select count(*) from orders where status in ('failed', 'canceled') and created_at >= since),
    'refunded_orders', (select count(*) from orders where status in ('refunded', 'partially_refunded') and created_at >= since),
    'disputed_orders', (select count(*) from orders where status = 'disputed'),
    'new_registrations', (select count(*) from profiles where created_at >= since),
    'active_learners', (select count(distinct user_id) from lesson_progress where updated_at >= since),
    'enrollments', (select count(*) from enrollments where started_at >= since),
    'completions', (select count(*) from enrollments where completed_at >= since),
    'pending_reviews', (select count(*) from assignment_submissions where status in ('submitted', 'in_review')),
    'orders_created', (select count(*) from orders where created_at >= since),
    'orders_paid', (select count(*) from orders where created_at >= since and paid_at is not null),
    'top_products', coalesce((select jsonb_agg(t) from (
        select p.title, count(*)::int as purchases from order_items oi join orders o on o.id = oi.order_id join products p on p.id = oi.product_id
        where o.paid_at >= since group by p.title order by count(*) desc, p.title limit 5) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;

revoke all on function require_admin(), course_readiness(uuid), publish_course(uuid), unpublish_course(uuid), set_product_active(uuid, boolean),
  set_product_price(uuid, integer, boolean), reorder_chapters(uuid, uuid[]), reorder_lessons(uuid, uuid[]), set_path_courses(uuid, uuid[]),
  admin_grant_access(uuid, uuid, integer, text), admin_revoke_access(uuid, uuid, text), review_submission(uuid, submission_status, text), admin_metrics(integer),
  log_admin_action(text, text, text, jsonb)
  from public, anon;
grant execute on function course_readiness(uuid), publish_course(uuid), unpublish_course(uuid), set_product_active(uuid, boolean),
  set_product_price(uuid, integer, boolean), reorder_chapters(uuid, uuid[]), reorder_lessons(uuid, uuid[]), set_path_courses(uuid, uuid[]),
  admin_grant_access(uuid, uuid, integer, text), admin_revoke_access(uuid, uuid, text), review_submission(uuid, submission_status, text), admin_metrics(integer),
  log_admin_action(text, text, text, jsonb)
  to authenticated;
