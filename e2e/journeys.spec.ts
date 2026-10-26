import { expect, test } from "@playwright/test";
import { grantCourse, signIn, signOut, signUp, sql, uniqueEmail, userId, verifyEmail } from "./helpers";

const stamp = Date.now().toString(36);
const learnerName = `Alice Run${stamp}`;
const learner = uniqueEmail("alice");
const other = uniqueEmail("bob");
const admin = uniqueEmail("admin");

test.describe.configure({ mode: "serial" });

test("visitor browses the catalogue and cannot buy an unpublished module", async ({ page }) => {
  await page.goto("/formations");
  await expect(page.getByRole("heading", { name: /modules TRAIL/ })).toBeVisible();
  await page.getByLabel("Recherche").fill("rag");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByRole("link", { name: /Retrieval-Augmented Generation/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Retrieval/ })).toBeVisible();
  await expect(page.getByText(/En préparation|Aperçu gratuit/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Acheter ce module" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Me prévenir" })).toBeVisible();
});

test("the advisor understands a free-text description and recommends a path with reasons", async ({ page }) => {
  await page.goto("/conseiller");
  await page.getByLabel(/Décrivez votre métier/).fill("Je suis UX designer, je débute avec l'IA et je veux concevoir l'expérience utilisateur d'un assistant. J'ai 4h par semaine.");
  await page.getByRole("button", { name: "Me proposer un parcours" }).click();
  await expect(page.getByText("Ce que j'ai compris")).toBeVisible();
  await expect(page.getByText(/Commencez par/)).toBeVisible();
  await expect(page.getByText("Pourquoi cette recommandation")).toBeVisible();
  await expect(page.getByText(/M14 · AI UX/).first()).toBeVisible();
});

test("the six-question advisor still recommends a path with reasons", async ({ page }) => {
  await page.goto("/conseiller?mode=questionnaire");
  await page.getByRole("button", { name: "Obtenir ma recommandation" }).click();
  await expect(page.getByText("Parcours recommandé")).toBeVisible();
  await expect(page.getByText("Pourquoi ce parcours")).toBeVisible();
});

test("launch-notification sign-up requires consent and records it", async ({ page }) => {
  await page.goto("/formations/rag");
  const email = uniqueEmail("interest");
  await page.getByLabel(/Adresse e-mail/).fill(email);
  await page.getByRole("button", { name: "Me prévenir" }).click(); // consent box is required by the browser: nothing is sent
  expect(await sql("select 1 from interest_signups where email = $1", [email])).toHaveLength(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Me prévenir" }).click();
  await expect(page.getByText("C'est noté")).toBeVisible();
  expect(await sql("select 1 from interest_signups where email = $1", [email])).toHaveLength(1);
});

test("a learner signs up, signs in and sees an empty dashboard", async ({ page }) => {
  await signUp(page, learnerName, learner);
  // Unverified accounts cannot sign in.
  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(learner);
  await page.getByLabel("Mot de passe", { exact: true }).fill("correct horse battery staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(/non confirmée/)).toBeVisible();
  await verifyEmail(learner);
  await signIn(page, learner);
  await expect(page.getByRole("heading", { name: "Bonjour Alice" })).toBeVisible();
  await expect(page.getByText("Aucune formation pour le moment")).toBeVisible();
  expect(await sql("select role from user_roles where user_id = $1", [await userId(learner)])).toEqual([{ role: "learner" }]);
});

test("without an entitlement the course player is closed", async ({ page }) => {
  await signIn(page, learner);
  await page.goto("/apprendre/prompt-engineering");
  await expect(page).toHaveURL(/\/formations\/prompt-engineering/);
});

test("a learner works through a module: progress, quiz, deliverable", async ({ page }) => {
  await grantCourse(learner, "M4"); // stands in for the Stripe webhook; provisioning itself is covered by the database tests
  await signIn(page, learner);
  await expect(page.getByRole("heading", { name: "Mes formations" })).toBeVisible();
  await page.getByRole("link", { name: "Reprendre la leçon" }).or(page.getByRole("link", { name: "Prompt Engineering" })).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Structure et patterns de prompts" })).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme terminée et continuer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Few-shot prompting" })).toBeVisible();

  // Notes are private and persist.
  await page.getByLabel(/Nouvelle note/).fill("Ma note de test");
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Ma note de test")).toBeVisible();

  // Progress persists across sign-out / sign-in.
  await page.goto("/compte");
  await expect(page.getByText("20 %").first()).toBeVisible();
  await signOut(page);
  await signIn(page, learner);
  await expect(page.getByText("20 %").first()).toBeVisible();

  // Quiz: wrong answer fails, right answer passes; both attempts are kept.
  await page.goto("/apprendre/prompt-engineering");
  await page.getByRole("link", { name: "Quiz du module" }).click();
  await page.getByLabel("Mauvaise réponse (test)").check();
  await page.getByRole("button", { name: "Valider mes réponses" }).click();
  await expect(page.getByText(/seuil non atteint/)).toBeVisible();
  await page.getByLabel("Bonne réponse (test)").check();
  await page.getByRole("button", { name: "Valider mes réponses" }).click();
  await expect(page.getByText("Réussi — 100 %")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Historique des tentatives")).toBeVisible();

  // Deliverable (written answer): the module stays incomplete until the instructor accepts.
  await page.goto("/apprendre/prompt-engineering"); // the course home resumes on a lesson, whose outline lists the deliverable
  await page.getByRole("link", { name: "Livrable pratique" }).click();
  await page.getByLabel("Réponse écrite").fill("Voici mon livrable.");
  await page.getByRole("button", { name: "Envoyer mon livrable" }).click();
  await expect(page.getByText("Livrable envoyé")).toBeVisible();

  // Finish every remaining lesson: the module is still incomplete because the deliverable awaits review.
  for (let i = 0; i < 4; i++) {
    await page.goto("/apprendre/prompt-engineering"); // resumes on the first unfinished lesson
    const saved = page.waitForResponse((r) => r.url().includes("/api/progress") && r.ok());
    await page.getByRole("button", { name: /Marquer comme terminée/ }).click();
    await saved;
  }
  await page.goto("/compte");
  await expect(page.getByText("100 %").first()).toBeVisible();
  expect(await sql("select 1 from attestations where user_id = $1", [await userId(learner)])).toHaveLength(0);
});

test("the instructor administers, reviews the deliverable and the attestation is issued", async ({ page, browser }) => {
  await signUp(page, "Sophie Admin", admin);
  await verifyEmail(admin);
  await sql("insert into user_roles (user_id, role) values ($1, 'admin')", [await userId(admin)]);
  await signIn(page, admin);

  // Every admin screen renders from real data without an error banner.
  for (const [path, heading] of [["/admin", "Tableau de bord"], ["/admin/cours", "Modules"], ["/admin/parcours", "Parcours"], ["/admin/produits", "Produits et prix"], ["/admin/coupons", "Codes promo"],
    ["/admin/commandes", "Commandes"], ["/admin/apprenants", "Apprenants"], ["/admin/devoirs", "Relecture des livrables"], ["/admin/cms", "Contenu du site"], ["/admin/journal", "Journal d'audit"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0); // ignores Next.js' own empty route announcer
  }

  // Review queue: accept the learner's deliverable.
  await page.goto("/admin/devoirs");
  const card = page.locator("section", { hasText: learnerName });
  await expect(card.getByText("Voici mon livrable.")).toBeVisible();
  await card.getByLabel("Commentaire (obligatoire pour une révision)").fill("Très bon travail.");
  await card.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Livrable accepté")).toBeVisible();

  // The attestation exists and is publicly verifiable.
  const [att] = await sql<{ verification_code: string }>("select verification_code from attestations where user_id = $1", [await userId(learner)]);
  expect(att).toBeTruthy();
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/verification/${att.verification_code}`);
  await expect(visitor.getByText(learnerName)).toBeVisible();
  await expect(visitor.getByText("Prompt Engineering")).toBeVisible();
  await visitor.goto("/verification/000000000000000000000000");
  await expect(visitor.getByText("Attestation introuvable")).toBeVisible();

  // The audit log recorded the review.
  await page.goto("/admin/journal?entity=assignment_submissions");
  await expect(page.getByText("UPDATE").first()).toBeVisible();
});

test("the instructor creates a module, hits the readiness gate, then publishes", async ({ page }) => {
  await signIn(page, admin);
  const code = `M${900 + Math.floor(Math.random() * 90)}`;
  const [{ next }] = await sql<{ next: number }>("select coalesce(max(position), 0) + 1 as next from courses");
  await page.goto("/admin/cours");
  await page.getByLabel("Code (M19…)").fill(code);
  await page.getByLabel("Slug (URL)").fill(`module-${code.toLowerCase()}`);
  await page.getByLabel("Titre").fill("Module d'essai");
  await page.getByLabel("Résumé").fill("Un module créé par le test de bout en bout.");
  await page.getByLabel("Ordre recommandé").fill(String(next));
  await page.getByRole("button", { name: /Créer en/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Module d'essai" })).toBeVisible();

  // Not publishable yet: no lessons, no learning outcomes.
  await expect(page.getByText("Aucune leçon publiée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publier le module" })).toBeDisabled();

  await page.getByLabel(/Objectifs d'apprentissage/).fill("Savoir tester une plateforme.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("link", { name: "Chapitres et leçons" }).click();
  await page.getByLabel("Titre du chapitre").last().fill("Chapitre 1");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await page.getByText("Ajouter une leçon").click();
  await page.getByLabel("Titre", { exact: true }).last().fill("Leçon d'essai");
  await page.getByLabel("Statut").last().selectOption("published");
  await page.getByRole("button", { name: "Créer puis compléter" }).click();
  await page.getByLabel("Texte de la leçon (Markdown)").fill("## Contenu\n\nTexte validé.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Leçon enregistrée.")).toBeVisible();

  await page.goto("/admin/cours");
  await page.getByRole("row", { name: new RegExp(code) }).getByRole("link", { name: "Gérer" }).click();
  await page.getByRole("button", { name: "Publier le module" }).click();
  await expect(page.getByText(/Module publié/)).toBeVisible();
  // Publishing does not open the sale: the offer stays closed until explicitly activated.
  expect(await sql("select 1 from products p join courses c on c.id = p.course_id where c.code = $1 and p.active", [code])).toHaveLength(0);
});

test("access control: learners cannot reach the admin and cannot read each other's data", async ({ page, browser }) => {
  await signUp(page, "Bob Durand", other);
  await verifyEmail(other);
  await signIn(page, other);
  await page.goto("/admin");
  await expect(page).toHaveURL(/localhost:\d+\/$/); // sent home, not shown the admin
  await page.goto("/admin/commandes");
  await expect(page).toHaveURL(/localhost:\d+\/$/);

  // Bob never sees Alice's course content even by guessing the lesson URL.
  const [lesson] = await sql<{ id: string }>("select l.id from lessons l join courses c on c.id = l.course_id where c.code = 'M4' limit 1");
  await page.goto(`/apprendre/prompt-engineering/${lesson.id}`);
  await expect(page).toHaveURL(/\/formations\/prompt-engineering/);

  // An anonymous visitor is sent to the login page.
  const anon = await (await browser.newContext()).newPage();
  for (const path of ["/compte", "/admin", `/apprendre/prompt-engineering/${lesson.id}`]) {
    await anon.goto(path);
    await expect(anon).toHaveURL(/\/connexion/);
  }
  // Direct API calls are refused too.
  const res = await anon.request.post("/api/progress", { data: { lessonId: lesson.id, position: 1 } });
  expect(res.status()).toBe(401);
});
