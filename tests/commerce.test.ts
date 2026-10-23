// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";
let db: PGlite;
let seq = 0;

const one = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows[0];
const count = async (sql: string) => Number((await one<{ n: number }>(`select count(*)::int n from (${sql}) x`)).n);
const asService = async <T>(fn: () => Promise<T>): Promise<T> => { await db.exec("set role service_role"); try { return await fn(); } finally { await db.exec("reset role"); } };
const asUser = async <T>(uid: string, fn: () => Promise<T>): Promise<T> => { await db.exec(`set role authenticated; select set_config('app.uid','${uid}',false)`); try { return await fn(); } finally { await db.exec("reset role"); } };

interface Result { status: string; order_id?: string; newly_paid?: boolean }
const event = async (type: string, data: Record<string, unknown>, id = `evt_${++seq}`): Promise<Result> =>
  asService(async () => (await db.query<{ r: Result }>(`select process_stripe_event($1, $2, $3::jsonb) r`, [id, type, JSON.stringify(data)])).rows[0].r);

/** Creates a pending order with a checkout session, as the checkout route does. */
async function newOrder(user: string, product: string) {
  const r = await asService(async () => (await db.query<{ r: { order_id: string; amount_cents: number } }>(`select create_checkout_order($1, $2) r`, [user, product])).rows[0].r);
  const session = `cs_${++seq}`;
  await asService(() => db.query(`select attach_checkout_session($1, $2)`, [r.order_id, session]));
  return { orderId: r.order_id, session, amount: r.amount_cents };
}
const completed = (o: { orderId: string; session: string; amount: number }, extra: Record<string, unknown> = {}) => ({
  order_id: o.orderId, session_id: o.session, payment_intent_id: `pi_${o.session}`, payment_status: "paid", amount_total: o.amount,
  amount_tax: 0, amount_discount: 0, currency: "eur", customer_id: `cus_${o.orderId}`, invoice_id: "in_1", ...extra,
});
const ents = (user: string, status = "active") => count(`select 1 from entitlements where user_id='${user}' and status='${status}'`);
const orderStatus = async (id: string) => (await one<{ status: string }>(`select status from orders where id='${id}'`)).status;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid, bucket_id text, name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;`);
  for (const f of ["0001_schema", "0002_rls", "0003_learning", "0004_commerce"]) await db.exec(readFileSync(`supabase/migrations/${f}.sql`, "utf8"));
  await db.exec(`grant usage on schema public, auth to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
    grant select on all tables in schema public to anon;`);
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(`insert into auth.users (id, email) values ('${U1}', 'u1@t.local'), ('${U2}', 'u2@t.local');`);
});

describe("checkout order creation rules", () => {
  const create = (user: string, slug: string) => asService(() => db.query(`select create_checkout_order($1, $2)`, [user, slug]));
  it("refuses products whose courses are not published (default state: nothing purchasable)", async () => {
    await expect(create(U1, "module-prompt-engineering")).rejects.toThrow(/product_unavailable/); // inactive
    await db.exec(`update products set active = true where slug = 'module-prompt-engineering'`);
    await expect(create(U1, "module-prompt-engineering")).rejects.toThrow(/not_published/);
    expect(await count("select 1 from orders")).toBe(0);
  });
  it("refuses unknown products, quotations and enterprise packs", async () => {
    await expect(create(U1, "nope")).rejects.toThrow(/product_unavailable/);
    await db.exec(`update products set active = true where slug in ('team-5', 'enterprise-custom')`);
    await expect(create(U1, "team-5")).rejects.toThrow(/not_purchasable_online/);
    await expect(create(U1, "enterprise-custom")).rejects.toThrow(/not_purchasable_online/);
  });
  it("is not callable by learners", async () => {
    await expect(asUser(U1, () => db.query(`select create_checkout_order('${U1}', 'module-prompt-engineering')`))).rejects.toThrow();
  });
  it("creates a pending order with a price snapshot once published", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M4'`);
    const o = await newOrder(U1, "module-prompt-engineering");
    expect(o.amount).toBe(19900); // M4 is a Standard module
    expect(await orderStatus(o.orderId)).toBe("pending");
    expect((await one<{ access_months: number; unit_amount_cents: number }>(`select * from order_items where order_id='${o.orderId}'`))).toMatchObject({ access_months: 12, unit_amount_cents: 19900 });
    expect(await ents(U1)).toBe(0); // creating an order never grants access
  });
});

describe("payment success", () => {
  let o: Awaited<ReturnType<typeof newOrder>>;
  beforeAll(async () => { o = await newOrder(U1, "module-prompt-engineering"); });

  it("grants access only when the verified paid event is applied", async () => {
    expect(await ents(U1)).toBe(0);
    const r = await event("checkout.session.completed", completed(o, { amount_tax: 2483, amount_discount: 0 }), "evt_paid");
    expect(r).toMatchObject({ status: "paid", newly_paid: true });
    expect(await orderStatus(o.orderId)).toBe("paid");
    expect(await ents(U1)).toBe(1);
    expect(await one(`select tax_cents, stripe_invoice_id from orders where id='${o.orderId}'`)).toMatchObject({ tax_cents: 2483, stripe_invoice_id: "in_1" });
    expect((await one<{ stripe_customer_id: string }>(`select stripe_customer_id from profiles where id='${U1}'`)).stripe_customer_id).toMatch(/^cus_/);
  });
  it("ignores a duplicate event id", async () => {
    expect(await event("checkout.session.completed", completed(o), "evt_paid")).toMatchObject({ status: "duplicate" });
    expect(await count("select 1 from payments")).toBe(1);
  });
  it("creates no duplicate payment or entitlement when Stripe replays under a new event id", async () => {
    const r = await event("checkout.session.completed", completed(o));
    expect(r.status).toBe("already_paid");
    expect(r.newly_paid).toBe(false);
    expect(await count("select 1 from payments")).toBe(1);
    expect(await ents(U1)).toBe(1);
  });
  it("blocks buying what is already owned", async () => {
    await expect(asService(() => db.query(`select create_checkout_order('${U1}', 'module-prompt-engineering')`))).rejects.toThrow(/already_owned/);
  });
  it("records the coupon discount actually charged", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M5'; update products set active = true where slug = 'module-context-engineering'`);
    const o2 = await newOrder(U2, "module-context-engineering");
    await event("checkout.session.completed", completed(o2, { amount_total: 11900, amount_discount: 3000 }));
    expect(await one(`select total_cents, discount_cents from orders where id='${o2.orderId}'`)).toMatchObject({ total_cents: 11900, discount_cents: 3000 });
  });
});

describe("event safety", () => {
  it("rejects events whose session does not belong to the order", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M6'; update products set active = true where slug = 'module-vibe-coding'`);
    const o = await newOrder(U2, "module-vibe-coding");
    const r = await event("checkout.session.completed", completed(o, { session_id: "cs_forged" }));
    expect(r.status).toBe("session_mismatch");
    expect(await orderStatus(o.orderId)).toBe("pending");
  });
  it("rejects currency mismatches", async () => {
    const o = await asService(async () => (await db.query<{ order_id: string }>(`select order_id from (select (create_checkout_order('${U1}', 'module-vibe-coding')->>'order_id')::uuid order_id) x`)).rows[0]);
    await asService(() => db.query(`select attach_checkout_session($1, 'cs_cur')`, [o.order_id]));
    const r = await event("checkout.session.completed", { order_id: o.order_id, session_id: "cs_cur", payment_status: "paid", amount_total: 14900, currency: "usd" });
    expect(r.status).toBe("currency_mismatch");
    expect(await orderStatus(o.order_id)).toBe("pending");
  });
  it("records unknown orders without failing", async () => {
    expect((await event("checkout.session.completed", { order_id: "11111111-1111-1111-1111-111111111111", session_id: "x", payment_status: "paid", currency: "eur", amount_total: 1 })).status).toBe("unknown_order");
  });
  it("rolls back the idempotency record when processing fails, so Stripe's retry can succeed", async () => {
    await expect(event("checkout.session.completed", { order_id: "not-a-uuid" }, "evt_bad")).rejects.toThrow();
    expect(await count(`select 1 from processed_webhook_events where stripe_event_id = 'evt_bad'`)).toBe(0);
  });
  it("ignores unrelated event types", async () => {
    expect((await event("customer.created", {})).status).toBe("unknown_order");
  });
  it("keeps webhook tables closed to learners", async () => {
    expect(await asUser(U1, () => count("select 1 from processed_webhook_events"))).toBe(0);
    await expect(asUser(U1, () => db.query(`select process_stripe_event('x','y','{}')`))).rejects.toThrow();
  });
});

describe("async, failed and expired payments", () => {
  it("keeps access closed while a delayed payment is unpaid, then grants it on success", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M3'; update products set active = true where slug = 'module-ia-generative'`);
    const o = await newOrder(U1, "module-ia-generative");
    expect((await event("checkout.session.completed", completed(o, { payment_status: "unpaid" }))).status).toBe("awaiting_payment");
    expect(await orderStatus(o.orderId)).toBe("pending");
    expect(await count(`select 1 from entitlements where user_id='${U1}' and course_id=(select id from courses where code='M3')`)).toBe(0);
    expect((await event("checkout.session.async_payment_succeeded", completed(o))).status).toBe("paid");
    expect(await count(`select 1 from entitlements where user_id='${U1}' and course_id=(select id from courses where code='M3') and status='active'`)).toBe(1);
  });
  it("marks failures, and lets a later successful retry still pay", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M1'; update products set active = true where slug = 'module-machine-learning'`);
    const o = await newOrder(U2, "module-machine-learning");
    expect((await event("payment_intent.payment_failed", { order_id: o.orderId, payment_intent_id: "pi_x" })).status).toBe("failed");
    expect(await orderStatus(o.orderId)).toBe("failed");
    expect(await count(`select 1 from entitlements where user_id='${U2}' and course_id=(select id from courses where code='M1')`)).toBe(0);
    expect((await event("checkout.session.completed", completed(o))).status).toBe("paid");
  });
  it("cancels expired sessions but never touches paid orders", async () => {
    await db.exec(`update courses set status = 'published' where code = 'M2'; update products set active = true where slug = 'module-deep-learning'`);
    const o = await newOrder(U1, "module-deep-learning");
    expect((await event("checkout.session.expired", { order_id: o.orderId, session_id: o.session })).status).toBe("canceled");
    const paid = (await one<{ id: string; s: string }>(`select id, stripe_checkout_session_id s from orders where status='paid' limit 1`));
    expect((await event("checkout.session.expired", { order_id: paid.id, session_id: paid.s })).status).toBe("already_paid");
  });
});

describe("refunds and disputes", () => {
  let o: Awaited<ReturnType<typeof newOrder>>;
  beforeAll(async () => {
    await db.exec(`update courses set status = 'published' where code in ('M7','M9','M14','M16','M18'); update products set active = true where slug = 'product-manager-augmente'`);
    o = await newOrder(U2, "product-manager-augmente"); // all 9 courses published now (M3,M4,M5,M6 done above)
    await event("checkout.session.completed", completed(o));
  });
  it("an Avancé module costs 299 €, and Mentored grants the same 18 modules as AI Mastery", async () => {
    const adv = await one<{ amount_cents: number }>(`select pr.amount_cents from prices pr join products p on p.id = pr.product_id join courses c on c.id = p.course_id where c.code = 'M11' and pr.active`);
    expect(adv.amount_cents).toBe(29900);
    const n = (slug: string) => count(`select 1 from product_course_access a join products p on p.id = a.product_id where p.slug = '${slug}'`);
    expect(await n("ai-mastery-mentored")).toBe(18);
    expect(await n("ai-mastery")).toBe(18);
    expect(await count(`select 1 from products where slug = 'ai-mastery-mentored' and active`)).toBe(0); // closed until the coaching is defined
  });
  it("team packs are 12-month, seat-based and not sold online", async () => {
    expect(await one(`select seats, access_months from products where slug = 'team-20'`)).toMatchObject({ seats: 20, access_months: 12 });
  });
  it("a path purchase grants every included course once, with 18 months of access", async () => {
    expect(await count(`select 1 from entitlements where order_item_id = (select id from order_items where order_id='${o.orderId}')`)).toBeGreaterThanOrEqual(1);
    expect(await count(`select 1 from entitlements where user_id='${U2}' and status='active'`)).toBeGreaterThanOrEqual(9);
    const months = (await one<{ m: number }>(`select round(extract(epoch from (expires_at - now())) / 2592000)::int m from entitlements where user_id='${U2}' and course_id=(select id from courses where code='M18')`)).m;
    expect(months).toBe(18);
  });
  it("buying a bundle extends, never duplicates, content already held", async () => {
    expect(await count(`select 1 from entitlements where user_id='${U2}' group by course_id having count(*) > 1`)).toBe(0);
  });
  it("a partial refund keeps access", async () => {
    const r = await event("charge.refunded", { payment_intent_id: `pi_${o.session}`, charge_id: "ch_1", amount_refunded: 5000, amount_captured: o.amount });
    expect(r.status).toBe("partially_refunded");
    expect(await orderStatus(o.orderId)).toBe("partially_refunded");
    expect(await count(`select 1 from entitlements where user_id='${U2}' and status='revoked' and order_item_id=(select id from order_items where order_id='${o.orderId}')`)).toBe(0);
    expect((await one<{ refunded_cents: number }>(`select refunded_cents from payments where order_id='${o.orderId}'`)).refunded_cents).toBe(5000);
  });
  it("a full refund revokes the access that order granted", async () => {
    const r = await event("charge.refunded", { payment_intent_id: `pi_${o.session}`, charge_id: "ch_1", amount_refunded: o.amount, amount_captured: o.amount });
    expect(r.status).toBe("refunded");
    expect(await count(`select 1 from entitlements where status='revoked' and order_item_id=(select id from order_items where order_id='${o.orderId}')`)).toBeGreaterThanOrEqual(1);
  });
  it("a revoked entitlement no longer opens lessons", async () => {
    await db.exec(`insert into chapters (course_id, title, position) select id, 'c', 1 from courses where code='M18'`);
    await db.exec(`insert into lessons (chapter_id, course_id, title, position, content_status) select ch.id, ch.course_id, 'x', 1, 'published' from chapters ch join courses c on c.id = ch.course_id where c.code='M18'`);
    expect(await asUser(U2, () => count("select 1 from lessons"))).toBe(0);
  });
  it("suspends access on dispute, restores it when won, keeps it revoked when lost", async () => {
    const d1 = await newOrder(U1, "module-context-engineering");
    await event("checkout.session.completed", completed(d1));
    expect((await event("charge.dispute.created", { payment_intent_id: `pi_${d1.session}` })).status).toBe("disputed");
    expect(await ents(U1, "revoked")).toBeGreaterThanOrEqual(1);
    expect((await event("charge.dispute.closed", { payment_intent_id: `pi_${d1.session}`, dispute_status: "won" })).status).toBe("dispute_won");
    expect(await orderStatus(d1.orderId)).toBe("paid");
    expect(await count(`select 1 from entitlements where user_id='${U1}' and course_id=(select id from courses where code='M5') and status='active'`)).toBe(1);

    await db.exec(`update courses set status = 'published' where code = 'M13'; update products set active = true where slug = 'module-llm-safety-security'`);
    const d2 = await newOrder(U1, "module-llm-safety-security");
    await event("checkout.session.completed", completed(d2));
    await event("charge.dispute.created", { payment_intent_id: `pi_${d2.session}` });
    expect((await event("charge.dispute.closed", { payment_intent_id: `pi_${d2.session}`, dispute_status: "lost" })).status).toBe("dispute_lost");
    expect(await count(`select 1 from entitlements where user_id='${U1}' and course_id=(select id from courses where code='M13') and status='revoked'`)).toBe(1);
  });
  it("never leaves two active rows for one user and course", async () => {
    expect(await count(`select 1 from entitlements group by user_id, course_id having count(*) > 1`)).toBe(0);
  });
});
