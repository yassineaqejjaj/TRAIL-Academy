/**
 * Regenerates docs/screenshots/*.png from the RUNNING application (see TESTING.md for the stack).
 * It drives the real UI with fictional demo accounts in the local development database (never production data):
 *   E2E_CHANNEL=chrome DATABASE_URL=… E2E_BASE_URL=http://localhost:3105 npm run screenshots
 * Lesson content comes from db/dev-fixture.sql: placeholders, no video.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import pg from "pg";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3105";
const out = process.env.SHOTS_DIR ?? "docs/screenshots";
const theme = process.env.THEME === "light" ? "light" : "dark"; // THEME=light captures the light theme
const PASSWORD = "demo passphrase 2026";
const stamp = Date.now().toString(36);
const emails = { learner: `camille.${stamp}@example.test`, finisher: `karim.${stamp}@example.test`, admin: `formateur.${stamp}@example.test` };
const names = { learner: "Camille Dubois", finisher: "Karim Benali", admin: "Formateur TRAIL" };

const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres" });
await db.connect();
const browser: Browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || undefined });

const ctx = async (opts: Parameters<Browser["newContext"]>[0] = {}) => {
  const c = await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 800 }, locale: "fr-FR", ...opts });
  await c.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* storage unavailable */ } }, theme);
  return c;
};
const shot = (page: Page, name: string, opts: { full?: boolean } = {}) =>
  page.screenshot({ path: `${out}/${name}.${opts.full ? "jpg" : "png"}`, fullPage: opts.full, type: opts.full ? "jpeg" : "png", quality: opts.full ? 80 : undefined });

async function signUp(page: Page, role: keyof typeof emails) {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill(names[role]);
  await page.getByLabel("E-mail").fill(emails[role]);
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByText("Vérifiez votre boîte mail").waitFor();
  await db.query("update auth.users set email_verified = true where email = $1", [emails[role]]);
}
async function signIn(page: Page, role: keyof typeof emails) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(emails[role]);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/compte/);
}
const grant = (role: keyof typeof emails) => db.query("insert into entitlements (user_id, course_id, expires_at) select u.id, c.id, now() + interval '12 months' from auth.users u, courses c where u.email = $1 and c.code = 'M4'", [emails[role]]);

// ── Public site ───────────────────────────────────────────────────────
{
  const c = await ctx(); const page = await c.newPage();
  await page.goto("/"); await shot(page, "01-accueil"); await shot(page, "01-accueil-complet", { full: true });
  await page.goto("/formations"); await shot(page, "02-catalogue");
  await page.goto("/formations/rag"); await shot(page, "03-fiche-module");
  await page.goto("/parcours"); await shot(page, "04-parcours");
  await page.goto("/tarifs"); await shot(page, "05-tarifs", { full: true });
  await page.goto("/formateur"); await shot(page, "23-formateur");
  await page.goto("/conseiller");
  await page.getByLabel(/Décrivez votre métier/).fill("Je suis Product Owner dans une banque, je débute avec l'IA et je veux l'intégrer à mes fonctionnalités. J'ai 3h par semaine.");
  await page.getByRole("button", { name: "Me proposer un parcours" }).click();
  await page.getByText("Ce que j'ai compris").waitFor();
  await shot(page, "06-conseiller");
  await page.goto("/conseiller?mode=questionnaire");
  await page.getByLabel("Votre rôle actuel").selectOption("product");
  await page.getByRole("button", { name: "Obtenir ma recommandation" }).click();
  await page.getByText("Parcours recommandé").waitFor();
  await shot(page, "06b-questionnaire");
  await page.goto("/connexion"); await shot(page, "07-connexion");
  await c.close();
}

// ── Learner ───────────────────────────────────────────────────────────
const learnerCtx = await ctx(); const learner = await learnerCtx.newPage();
await signUp(learner, "learner"); await grant("learner"); await signIn(learner, "learner");
await learner.goto("/apprendre/prompt-engineering");
for (let i = 0; i < 2; i++) { // two lessons done
  const saved = learner.waitForResponse((r) => r.url().includes("/api/progress") && r.ok());
  await learner.getByRole("button", { name: /Marquer comme terminée/ }).click(); await saved;
  await learner.goto("/apprendre/prompt-engineering");
}
await learner.getByLabel(/Nouvelle note/).fill("Penser à structurer le prompt : rôle, contexte, tâche, format de sortie.");
await learner.getByRole("button", { name: "Enregistrer la note" }).click();
await learner.waitForFunction(() => (document.querySelector("#note") as HTMLTextAreaElement | null)?.value === ""); // saved: the form was cleared
await learner.getByRole("listitem").filter({ hasText: "Penser à structurer le prompt" }).waitFor();
await shot(learner, "09-lecteur");
await learner.goto("/apprendre/prompt-engineering");
await learner.getByRole("link", { name: "Quiz du module" }).click();
await learner.getByLabel("Bonne réponse (test)").check();
await learner.getByRole("button", { name: "Valider mes réponses" }).click();
await learner.getByText("Réussi — 100 %").waitFor();
await shot(learner, "10-quiz");
await learner.goto("/apprendre/prompt-engineering");
await learner.getByRole("link", { name: "Livrable pratique" }).click();
await learner.getByLabel("Réponse écrite").fill("Mon prompt : « Tu es analyste produit… » avec un format de sortie JSON et trois exemples.");
await learner.getByRole("button", { name: "Envoyer mon livrable" }).click();
await learner.getByText("Livrable envoyé").waitFor();
await shot(learner, "11-livrable");
await learner.goto("/compte"); await learner.getByText(/reprenons où vous en étiez/).waitFor(); await shot(learner, "08-tableau-de-bord");
await learner.goto("/compte/donnees"); await shot(learner, "25-compte-donnees");
// A live session for the demo (the app itself only creates sessions through the administration).
const sessionId = (await db.query("insert into live_sessions (title, description, course_id, starts_at, duration_minutes, capacity, audience, meeting_url, status) select 'Atelier : écrire un prompt de référence', 'Atelier pratique en direct : nous construisons ensemble un prompt structuré, nous le testons sur vos cas et nous en discutons les limites. Prérequis : avoir parcouru les deux premières leçons du module.', id, date_trunc('day', now() + interval '5 days') + interval '17 hours', 90, 12, 'learners', 'https://meet.jit.si/TRAIL-demo-room', 'published' from courses where code = 'M4' returning id")).rows[0].id;
await learner.goto("/sessions"); await shot(learner, "27-sessions", { full: true });
await learner.goto(`/sessions/${sessionId}`);
await learner.getByRole("button", { name: "Réserver ma place" }).click();
await learner.getByText("Place réservée").waitFor();
await shot(learner, "28-session-reservee");
// a phone-sized view of the same screens (the site is dark only)
{
  const phone = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }); const m = await phone.newPage();
  await m.context().addCookies(await learnerCtx.cookies());
  await m.goto("/apprendre/prompt-engineering"); await m.waitForURL(/apprendre\/prompt-engineering\/.+/); await shot(m, "18-mobile-lecteur");
  await m.goto("/formations"); await shot(m, "19-mobile-catalogue"); await phone.close();
}
await learnerCtx.close();

// ── A second learner who completes the module, then the instructor's review ──
const finisherCtx = await ctx(); const finisher = await finisherCtx.newPage();
await signUp(finisher, "finisher"); await grant("finisher");
const finisherId = (await db.query("select id from auth.users where email = $1", [emails.finisher])).rows[0].id;
await db.query("begin");
await db.query("set local role authenticated"); // from here on RLS applies exactly as for a real request
await db.query("select set_config('app.uid', $1, true)", [finisherId]);
for (const l of (await db.query("select id from lessons where course_id = (select id from courses where code = 'M4') and content_status = 'published'")).rows) await db.query("select record_lesson_progress($1, 0, true)", [l.id]);
const quiz = (await db.query("select id from quizzes where title = 'Quiz du module'")).rows[0].id;
const opt = (await db.query("select option_id, question_id from get_quiz_options($1) where label = 'Bonne réponse (test)'", [quiz])).rows[0];
await db.query("select submit_quiz($1, $2::jsonb)", [quiz, JSON.stringify({ [opt.question_id]: [opt.option_id] })]);
await db.query("insert into assignment_submissions (assignment_id, user_id, body) select a.id, auth.uid(), 'Livrable de démonstration.' from assignments a where a.title = 'Livrable pratique'");
await db.query("commit");
await finisherCtx.close();

const adminCtx = await ctx(); const admin = await adminCtx.newPage();
await signUp(admin, "admin");
await db.query("insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = $1", [emails.admin]);
await signIn(admin, "admin");
await admin.goto("/admin/devoirs"); await shot(admin, "16-admin-relecture");
const card = admin.locator("section", { hasText: names.finisher });
await card.getByLabel("Commentaire (obligatoire pour une révision)").fill("Très bon travail, structure claire.");
await card.getByRole("button", { name: "Enregistrer" }).click();
await admin.getByText("Livrable accepté").waitFor();
const code = (await db.query("select a.verification_code from attestations a join auth.users u on u.id = a.user_id where u.email = $1", [emails.finisher])).rows[0].verification_code;
{ const v = await ctx(); const p = await v.newPage(); await p.goto(`/verification/${code}`); await shot(p, "12-attestation"); await v.close(); }

// ── Instructor's admin ────────────────────────────────────────────────
await admin.goto("/admin"); await shot(admin, "13-admin-tableau-de-bord");
const courseId = (await db.query("select id from courses where code = 'M4'")).rows[0].id;
await admin.goto(`/admin/cours/${courseId}`); await shot(admin, "14-admin-module");
await admin.goto(`/admin/cours/${courseId}/contenu`); await shot(admin, "15-admin-contenu");
await admin.goto("/admin/produits"); await shot(admin, "20-admin-produits");
await admin.goto("/admin/sessions"); await shot(admin, "29-admin-sessions");
await admin.goto("/admin/cms"); await shot(admin, "21-admin-cms");
await admin.goto("/admin/production"); await admin.getByRole("heading", { name: "Vérifications en direct" }).waitFor(); await shot(admin, "24-admin-production", { full: true });
const lessonId = (await db.query("select id from lessons where course_id = $1 order by position limit 1", [courseId])).rows[0].id;
await admin.goto(`/admin/cours/${courseId}/lecons/${lessonId}`); await admin.getByRole("heading", { name: "Vidéo" }).scrollIntoViewIfNeeded(); await shot(admin, "26-admin-video");
await admin.goto("/admin/journal"); await shot(admin, "22-admin-journal");
await adminCtx.close();

await browser.close();
await db.end();
console.log("screenshots written to", out);
