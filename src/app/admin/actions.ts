"use server";
import { z } from "zod";
import { adminDb, dbMessage, flash, formData, revalidatePublic } from "@/lib/admin/ctx";
import { couponSchema, eurosToCents, grantSchema, reviewSchema, slugSchema } from "@/lib/admin/schemas";
import { getStripe } from "@/lib/stripe/client";
import { stripeMode } from "@/lib/stripe/guard";

const uuid = z.string().uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";

// ───────── Learning paths ─────────
export async function createPath(fd: FormData) {
  const { db } = await adminDb();
  const p = z.object({ slug: slugSchema, title: z.string().trim().min(2).max(120), accessMonths: z.coerce.number().int().min(1).max(60), kind: z.enum(["path", "bundle"]) }).safeParse(formData(fd));
  if (!p.success) flash("/admin/parcours", "error", issue(p.error));
  const v = p.data!;
  const { data, error } = await db.from("learning_paths").insert({ slug: v.slug, title: v.title, access_months: v.accessMonths, is_bundle: v.kind === "bundle" }).select("id").single();
  if (error || !data) flash("/admin/parcours", "error", dbMessage(error));
  // The sellable product is created closed: it needs published courses and a price before it can be activated.
  const { error: e2 } = await db.from("products").insert({ slug: v.slug, kind: v.kind, title: v.title, path_id: data!.id, access_months: v.accessMonths, active: false });
  if (e2) flash("/admin/parcours", "error", dbMessage(e2));
  revalidatePublic();
  flash("/admin/parcours", "ok", "Parcours créé. Ajoutez des modules puis définissez le prix dans « Produits et prix ».");
}

export async function updatePath(pathId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = z.object({ title: z.string().trim().min(2).max(120), tagline: z.string().trim().max(300), audience: z.string().trim().max(300), accessMonths: z.coerce.number().int().min(1).max(60) }).safeParse(formData(fd));
  if (!p.success) flash("/admin/parcours", "error", issue(p.error));
  const v = p.data!;
  const { error } = await db.from("learning_paths").update({ title: v.title, tagline: v.tagline || null, audience: v.audience || null, access_months: v.accessMonths }).eq("id", pathId);
  if (error) flash("/admin/parcours", "error", dbMessage(error));
  await db.from("products").update({ title: v.title, access_months: v.accessMonths }).eq("path_id", pathId);
  revalidatePublic();
  flash("/admin/parcours", "ok", "Parcours mis à jour.");
}

async function currentPathCourses(db: Awaited<ReturnType<typeof adminDb>>["db"], pathId: string): Promise<string[]> {
  const { data } = await db.from("learning_path_courses").select("course_id").eq("path_id", pathId).order("position");
  return (data ?? []).map((r) => r.course_id);
}
async function savePathCourses(db: Awaited<ReturnType<typeof adminDb>>["db"], pathId: string, ids: string[], msg: string) {
  const { error } = await db.rpc("set_path_courses", { p_path: pathId, p_course_ids: ids });
  if (error) flash("/admin/parcours", "error", dbMessage(error));
  revalidatePublic();
  flash("/admin/parcours", "ok", msg);
}
export async function addPathCourse(pathId: string, fd: FormData) {
  const { db } = await adminDb();
  const c = uuid.safeParse(fd.get("courseId"));
  if (!c.success) flash("/admin/parcours", "error", "Choisissez un module.");
  const ids = await currentPathCourses(db, pathId);
  if (ids.includes(c.data!)) flash("/admin/parcours", "error", "Ce module est déjà dans le parcours.");
  await savePathCourses(db, pathId, [...ids, c.data!], "Module ajouté.");
}
export async function removePathCourse(pathId: string, courseId: string) {
  const { db } = await adminDb();
  await savePathCourses(db, pathId, (await currentPathCourses(db, pathId)).filter((x) => x !== courseId), "Module retiré.");
}
export async function movePathCourse(pathId: string, courseId: string, dir: "up" | "down") {
  const { db } = await adminDb();
  const ids = await currentPathCourses(db, pathId);
  const i = ids.indexOf(courseId), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) flash("/admin/parcours", "ok", "Déjà à cette position.");
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await savePathCourses(db, pathId, ids, "Ordre mis à jour.");
}

// ───────── Products & prices ─────────
export async function setPrice(productId: string, fd: FormData) {
  const { db } = await adminDb();
  const raw = String(fd.get("amount") ?? "").trim();
  const cents = raw === "" ? null : eurosToCents(raw);
  if (raw !== "" && cents === null) flash("/admin/produits", "error", "Montant invalide (ex. 149 ou 149,50).");
  const { error } = await db.rpc("set_product_price", { p_product: productId, p_amount_cents: cents, p_tax_inclusive: fd.get("tax") !== "ht" });
  if (error) flash("/admin/produits", "error", dbMessage(error));
  revalidatePublic();
  flash("/admin/produits", "ok", "Prix enregistré (l'historique est conservé ; les commandes passées ne changent pas).");
}

export async function setProductActive(productId: string, active: boolean) {
  const { db } = await adminDb();
  const { error } = await db.rpc("set_product_active", { p_product: productId, p_active: active });
  if (error) flash("/admin/produits", "error", dbMessage(error));
  revalidatePublic();
  flash("/admin/produits", "ok", active ? "Offre ouverte à l'achat." : "Offre fermée.");
}

// ───────── Coupons ─────────
export async function createCoupon(fd: FormData) {
  const { db } = await adminDb();
  const p = couponSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/coupons", "error", issue(p.error));
  const v = p.data!;
  const { data, error } = await db.from("coupons").insert({
    code: v.code, percent_off: v.percentOff, amount_off_cents: v.amountOffCents, valid_until: v.validUntil ? new Date(`${v.validUntil}T23:59:59Z`).toISOString() : null, max_redemptions: v.maxRedemptions ?? null,
  }).select("id").single();
  if (error || !data) flash("/admin/coupons", "error", dbMessage(error));

  // Best-effort Stripe sync so the code works at checkout. UNVERIFIED against Stripe: failures leave the coupon unsynced.
  if (stripeMode(process.env).ok) {
    try {
      const stripe = getStripe();
      const coupon = await stripe.coupons.create({
        duration: "once", ...(v.percentOff ? { percent_off: v.percentOff } : { amount_off: v.amountOffCents!, currency: "eur" }),
        ...(v.maxRedemptions ? { max_redemptions: v.maxRedemptions } : {}), ...(v.validUntil ? { redeem_by: Math.floor(new Date(`${v.validUntil}T23:59:59Z`).getTime() / 1000) } : {}),
      });
      const promo = await stripe.promotionCodes.create({ promotion: { type: "coupon", coupon: coupon.id }, code: v.code });
      await db.from("coupons").update({ stripe_coupon_id: coupon.id, stripe_promotion_code_id: promo.id }).eq("id", data!.id);
    } catch { flash("/admin/coupons", "error", "Code enregistré mais non synchronisé avec Stripe : il ne fonctionnera pas au paiement."); }
  }
  flash("/admin/coupons", "ok", stripeMode(process.env).ok ? "Code promo créé et synchronisé." : "Code créé localement : Stripe n'est pas configuré, il ne sera pas utilisable au paiement.");
}

export async function setCouponActive(couponId: string, active: boolean) {
  const { db } = await adminDb();
  const { data } = await db.from("coupons").update({ active }).eq("id", couponId).select("stripe_promotion_code_id").single();
  if (data?.stripe_promotion_code_id && stripeMode(process.env).ok) {
    try { await getStripe().promotionCodes.update(data.stripe_promotion_code_id, { active }); } catch { flash("/admin/coupons", "error", "Mis à jour ici, mais pas chez Stripe : vérifiez le code dans le tableau de bord Stripe."); }
  }
  flash("/admin/coupons", "ok", active ? "Code activé." : "Code désactivé.");
}

// ───────── Orders ─────────
/** Asks Stripe for a full refund. Our records change only when the verified webhook arrives. */
export async function refundOrder(orderId: string) {
  const { db } = await adminDb();
  if (!stripeMode(process.env).ok) flash("/admin/commandes", "error", "Stripe n'est pas configuré.");
  const { data: order } = await db.from("orders").select("status, stripe_payment_intent_id").eq("id", orderId).maybeSingle();
  if (!order?.stripe_payment_intent_id || !["paid", "partially_refunded"].includes(order.status)) flash("/admin/commandes", "error", "Cette commande n'est pas remboursable.");
  try { await getStripe().refunds.create({ payment_intent: order!.stripe_payment_intent_id!, reason: "requested_by_customer" }, { idempotencyKey: `refund-${orderId}` }); }
  catch { flash("/admin/commandes", "error", "Remboursement refusé ou impossible côté Stripe."); }
  await db.rpc("log_admin_action", { p_action: "refund_requested", p_entity: "orders", p_entity_id: orderId, p_details: { payment_intent: order!.stripe_payment_intent_id } });
  flash("/admin/commandes", "ok", "Remboursement demandé à Stripe. L'état de la commande et l'accès seront mis à jour à la réception de la confirmation.");
}

// ───────── Learners ─────────
export async function grantAccess(userId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `/admin/apprenants/${userId}`;
  const course = uuid.safeParse(fd.get("courseId"));
  const g = grantSchema.safeParse(formData(fd));
  if (!course.success || !g.success) flash(path, "error", g.success ? "Choisissez un module." : issue(g.error));
  const { error } = await db.rpc("admin_grant_access", { p_user: userId, p_course: course.data!, p_months: g.data!.months, p_reason: g.data!.reason });
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Accès accordé et journalisé.");
}

export async function revokeAccess(userId: string, courseId: string, fd: FormData) {
  const { db } = await adminDb();
  const path = `/admin/apprenants/${userId}`;
  const reason = z.string().trim().min(3).max(300).safeParse(fd.get("reason"));
  if (!reason.success) flash(path, "error", "Un motif est obligatoire.");
  const { error } = await db.rpc("admin_revoke_access", { p_user: userId, p_course: courseId, p_reason: reason.data! });
  if (error) flash(path, "error", dbMessage(error));
  flash(path, "ok", "Accès retiré et journalisé.");
}

// ───────── Assignment review ─────────
export async function reviewSubmission(submissionId: string, fd: FormData) {
  const { db } = await adminDb();
  const p = reviewSchema.safeParse(formData(fd));
  if (!p.success) flash("/admin/devoirs", "error", issue(p.error));
  const { error } = await db.rpc("review_submission", { p_id: submissionId, p_status: p.data!.status, p_feedback: p.data!.feedback ?? "" });
  if (error) flash("/admin/devoirs", "error", dbMessage(error));
  flash("/admin/devoirs", "ok", p.data!.status === "accepted" ? "Livrable accepté : la complétion du module est réévaluée." : "Retour enregistré.");
}
