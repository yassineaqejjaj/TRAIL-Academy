"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { flash, formData, revalidatePublic, UserFacingError, withAdmin } from "@/lib/admin/ctx";
import { couponSchema, eurosToCents, grantSchema, reviewSchema, slugSchema } from "@/lib/admin/schemas";
import { asUser, type Q } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { stripeMode } from "@/lib/stripe/guard";

const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";

// ───────── Learning paths ─────────
export async function createPath(fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ slug: slugSchema, title: z.string().trim().min(2).max(120), accessMonths: z.coerce.number().int().min(1).max(60), kind: z.enum(["path", "bundle"]) }).safeParse(formData(fd));
  if (!p.success) flash("/admin/parcours", "error", issue(p.error));
  const v = p.data!;
  await withAdmin(admin, "/admin/parcours", async (q) => {
    const row = await q.one<{ id: string }>("insert into learning_paths (slug, title, access_months, is_bundle) values ($1, $2, $3, $4) returning id", [v.slug, v.title, v.accessMonths, v.kind === "bundle"]);
    // The sellable product is created closed: it needs published courses and a price before it can be activated.
    await q("insert into products (slug, kind, title, path_id, access_months, active) values ($1, $2::product_kind, $3, $4, $5, false)", [v.slug, v.kind, v.title, row!.id, v.accessMonths]);
  });
  revalidatePublic();
  flash("/admin/parcours", "ok", "Parcours créé. Ajoutez des modules puis définissez le prix dans « Produits et prix ».");
}

export async function updatePath(pathId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ title: z.string().trim().min(2).max(120), tagline: z.string().trim().max(300), audience: z.string().trim().max(300), accessMonths: z.coerce.number().int().min(1).max(60) }).safeParse(formData(fd));
  if (!p.success) flash("/admin/parcours", "error", issue(p.error));
  const v = p.data!;
  await withAdmin(admin, "/admin/parcours", async (q) => {
    await q("update learning_paths set title = $2, tagline = $3, audience = $4, access_months = $5 where id = $1", [pathId, v.title, v.tagline || null, v.audience || null, v.accessMonths]);
    await q("update products set title = $2, access_months = $3 where path_id = $1", [pathId, v.title, v.accessMonths]);
  });
  revalidatePublic();
  flash("/admin/parcours", "ok", "Parcours mis à jour.");
}

async function pathCourses(q: Q, pathId: string): Promise<string[]> {
  return (await q<{ course_id: string }>("select course_id from learning_path_courses where path_id = $1 order by position", [pathId])).map((r) => r.course_id);
}
async function savePathCourses(admin: Awaited<ReturnType<typeof requireAdmin>>, pathId: string, edit: (ids: string[]) => string[], message: string) {
  await withAdmin(admin, "/admin/parcours", async (q) => {
    const next = edit(await pathCourses(q, pathId));
    await q("select set_path_courses($1, $2::uuid[])", [pathId, next]);
  });
  revalidatePublic();
  flash("/admin/parcours", "ok", message);
}
export async function addPathCourse(pathId: string, fd: FormData) {
  const admin = await requireAdmin();
  const c = uuid.safeParse(fd.get("courseId"));
  if (!c.success) flash("/admin/parcours", "error", "Choisissez un module.");
  await savePathCourses(admin, pathId, (ids) => {
    if (ids.includes(c.data!)) throw new UserFacingError("Ce module est déjà dans le parcours.");
    return [...ids, c.data!];
  }, "Module ajouté.");
}
export async function removePathCourse(pathId: string, courseId: string) {
  const admin = await requireAdmin();
  await savePathCourses(admin, pathId, (ids) => ids.filter((x) => x !== courseId), "Module retiré.");
}
export async function movePathCourse(pathId: string, courseId: string, dir: "up" | "down") {
  const admin = await requireAdmin();
  await savePathCourses(admin, pathId, (ids) => {
    const i = ids.indexOf(courseId), j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return ids;
    const out = [...ids];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  }, "Ordre mis à jour.");
}

// ───────── Products & prices ─────────
export async function setPrice(productId: string, fd: FormData) {
  const admin = await requireAdmin();
  const raw = String(fd.get("amount") ?? "").trim();
  const cents = raw === "" ? null : eurosToCents(raw);
  if (raw !== "" && cents === null) flash("/admin/produits", "error", "Montant invalide (ex. 149 ou 149,50).");
  const note = String(fd.get("note") ?? "").trim().slice(0, 200);
  await withAdmin(admin, "/admin/produits", async (q) => {
    await q("select set_product_price($1, $2, $3)", [productId, cents, fd.get("tax") !== "ht"]);
    // Display details live on the product, not the price, so they survive price changes.
    await q("update products set note = $2, price_from = $3 where id = $1", [productId, note || null, fd.get("priceFrom") === "on"]);
  });
  revalidatePublic();
  flash("/admin/produits", "ok", "Prix enregistré (l'historique est conservé ; les commandes passées ne changent pas).");
}

export async function setProductActive(productId: string, active: boolean) {
  const admin = await requireAdmin();
  await withAdmin(admin, "/admin/produits", (q) => q("select set_product_active($1, $2)", [productId, active]));
  revalidatePublic();
  flash("/admin/produits", "ok", active ? "Offre ouverte à l'achat." : "Offre fermée.");
}

// ───────── Coupons ─────────
export async function createCoupon(fd: FormData) {
  const admin = await requireAdmin();
  const p = couponSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/coupons", "error", issue(p.error));
  const v = p.data!;
  const validUntil = v.validUntil ? new Date(`${v.validUntil}T23:59:59Z`).toISOString() : null;
  const row = await withAdmin(admin, "/admin/coupons", (q) => q.one<{ id: string }>(
    "insert into coupons (code, percent_off, amount_off_cents, valid_until, max_redemptions) values ($1, $2, $3, $4, $5) returning id",
    [v.code, v.percentOff, v.amountOffCents, validUntil, v.maxRedemptions ?? null]));

  // Best-effort Stripe sync so the code works at checkout. UNVERIFIED against Stripe: failures leave the coupon unsynced.
  if (stripeMode(process.env).ok) {
    try {
      const stripe = getStripe();
      const coupon = await stripe.coupons.create({
        duration: "once", ...(v.percentOff ? { percent_off: v.percentOff } : { amount_off: v.amountOffCents!, currency: "eur" }),
        ...(v.maxRedemptions ? { max_redemptions: v.maxRedemptions } : {}), ...(v.validUntil ? { redeem_by: Math.floor(new Date(`${v.validUntil}T23:59:59Z`).getTime() / 1000) } : {}),
      });
      const promo = await stripe.promotionCodes.create({ promotion: { type: "coupon", coupon: coupon.id }, code: v.code });
      await asUser(admin.id, (q) => q("update coupons set stripe_coupon_id = $2, stripe_promotion_code_id = $3 where id = $1", [row!.id, coupon.id, promo.id]));
    } catch { flash("/admin/coupons", "error", "Code enregistré mais non synchronisé avec Stripe : il ne fonctionnera pas au paiement."); }
  }
  flash("/admin/coupons", "ok", stripeMode(process.env).ok ? "Code promo créé et synchronisé." : "Code créé localement : Stripe n'est pas configuré, il ne sera pas utilisable au paiement.");
}

export async function setCouponActive(couponId: string, active: boolean) {
  const admin = await requireAdmin();
  const row = await withAdmin(admin, "/admin/coupons", (q) => q.one<{ stripe_promotion_code_id: string | null }>("update coupons set active = $2 where id = $1 returning stripe_promotion_code_id", [couponId, active]));
  if (row?.stripe_promotion_code_id && stripeMode(process.env).ok) {
    try { await getStripe().promotionCodes.update(row.stripe_promotion_code_id, { active }); } catch { flash("/admin/coupons", "error", "Mis à jour ici, mais pas chez Stripe : vérifiez le code dans le tableau de bord Stripe."); }
  }
  flash("/admin/coupons", "ok", active ? "Code activé." : "Code désactivé.");
}

// ───────── Orders ─────────
/** Asks Stripe for a full refund. Our records change only when the verified webhook arrives. */
export async function refundOrder(orderId: string) {
  const admin = await requireAdmin();
  if (!stripeMode(process.env).ok) flash("/admin/commandes", "error", "Stripe n'est pas configuré.");
  const order = await withAdmin(admin, "/admin/commandes", (q) => q.one<{ status: string; stripe_payment_intent_id: string | null }>("select status, stripe_payment_intent_id from orders where id = $1", [orderId]));
  if (!order?.stripe_payment_intent_id || !["paid", "partially_refunded"].includes(order.status)) flash("/admin/commandes", "error", "Cette commande n'est pas remboursable.");
  try { await getStripe().refunds.create({ payment_intent: order!.stripe_payment_intent_id!, reason: "requested_by_customer" }, { idempotencyKey: `refund-${orderId}` }); }
  catch { flash("/admin/commandes", "error", "Remboursement refusé ou impossible côté Stripe."); }
  await withAdmin(admin, "/admin/commandes", (q) => q("select log_admin_action('refund_requested', 'orders', $1, $2::jsonb)", [orderId, JSON.stringify({ payment_intent: order!.stripe_payment_intent_id })]));
  flash("/admin/commandes", "ok", "Remboursement demandé à Stripe. L'état de la commande et l'accès seront mis à jour à la réception de la confirmation.");
}

// ───────── Learners ─────────
export async function grantAccess(userId: string, fd: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/apprenants/${userId}`;
  const course = uuid.safeParse(fd.get("courseId"));
  const g = grantSchema.safeParse(formData(fd));
  if (!course.success || !g.success) flash(path, "error", g.success ? "Choisissez un module." : issue(g.error));
  await withAdmin(admin, path, (q) => q("select admin_grant_access($1, $2, $3, $4)", [userId, course.data, g.data!.months, g.data!.reason]));
  flash(path, "ok", "Accès accordé et journalisé.");
}

export async function revokeAccess(userId: string, courseId: string, fd: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/apprenants/${userId}`;
  const reason = z.string().trim().min(3).max(300).safeParse(fd.get("reason"));
  if (!reason.success) flash(path, "error", "Un motif est obligatoire.");
  await withAdmin(admin, path, (q) => q("select admin_revoke_access($1, $2, $3)", [userId, courseId, reason.data]));
  flash(path, "ok", "Accès retiré et journalisé.");
}

// ───────── Assignment review ─────────
export async function reviewSubmission(submissionId: string, fd: FormData) {
  const admin = await requireAdmin();
  const p = reviewSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/devoirs", "error", issue(p.error));
  await withAdmin(admin, "/admin/devoirs", (q) => q("select review_submission($1, $2::submission_status, $3)", [submissionId, p.data!.status, p.data!.feedback ?? ""]));
  flash("/admin/devoirs", "ok", p.data!.status === "accepted" ? "Livrable accepté : la complétion du module est réévaluée." : "Retour enregistré.");
}
