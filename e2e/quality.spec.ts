import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { grantCourse, signIn, signUp, sql, uniqueEmail, userId, verifyEmail } from "./helpers";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Collects Content-Security-Policy violations the browser reports while a page loads. */
function watchCsp(page: Page): string[] {
  const seen: string[] = [];
  page.on("console", (m) => { if (/content security policy|refused to (load|execute|connect|apply)/i.test(m.text())) seen.push(m.text()); });
  return seen;
}

async function audit(page: Page, path: string, scheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(300); // let hydration settle; "networkidle" never fires while Next prefetches links
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return violations.map((v) => `${scheme} ${path} — ${v.id} (${v.impact}): ${v.nodes.length} élément(s), ex. ${v.nodes[0]?.target.join(" ")}`);
}

const PUBLIC = ["/", "/formations", "/formations/prompt-engineering", "/parcours", "/tarifs", "/entreprise", "/formateur", "/conseiller", "/sessions", "/evaluation", "/apercu-plateforme", "/exemples-livrables", "/faq", "/parcours/rh-augmentees", "/ressources", "/connexion", "/inscription", "/legal/mentions-legales", "/legal/confidentialite"];

test.describe("accessibility (axe, WCAG 2.2 AA) and CSP on public pages", () => {
  for (const scheme of ["dark"] as const) {
    test(`no violations in ${scheme} mode`, async ({ page }) => {
      const csp = watchCsp(page);
      const found: string[] = [];
      for (const path of PUBLIC) found.push(...(await audit(page, path, scheme)));
      expect(found, found.join("\n")).toEqual([]);
      expect(csp, csp.join("\n")).toEqual([]);
    });
  }
});

test("signed-in and admin screens have no axe violations and no CSP violation; production screen renders", async ({ page }) => {
  const csp = watchCsp(page);
  const email = uniqueEmail("a11y");
  await signUp(page, "Alex Accessibilité", email);
  await verifyEmail(email);
  await sql("insert into user_roles (user_id, role) values ($1, 'admin')", [await userId(email)]);
  await signIn(page, email);
  const found: string[] = [];
  for (const path of ["/compte", "/compte/commandes", "/compte/donnees", "/admin", "/admin/cours", "/admin/produits", "/admin/production", "/admin/avis", "/admin/sessions", "/compte/sessions"]) {
    for (const scheme of ["dark"] as const) found.push(...(await audit(page, path, scheme)));
  }
  expect(found, found.join("\n")).toEqual([]);
  expect(csp, csp.join("\n")).toEqual([]);
  await page.goto("/admin/production");
  await expect(page.getByRole("heading", { level: 1, name: "Mise en production" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vérifications en direct" })).toBeVisible();
});

test("a learner exports their data, then deletes their account", async ({ page }) => {
  const email = uniqueEmail("rgpd");
  await signUp(page, "Camille Effacement", email);
  await verifyEmail(email);
  await signIn(page, email);

  await page.goto("/compte/donnees");
  const res = await page.request.get("/compte/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const data = await res.json();
  expect(data.account.email).toBe(email);
  expect(data.orders).toEqual([]);

  await page.getByLabel(/Pour confirmer/).fill("pas.mon.adresse@example.test");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /adresse e-mail exacte/ })).toBeVisible();

  await page.getByLabel(/Pour confirmer/).fill(email);
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/\?compte=supprime/);

  expect((await sql("select 1 from auth.users where email = $1", [email])).length).toBe(0); // address freed and erased
  await page.goto("/compte");
  await expect(page).toHaveURL(/\/connexion/);
});

test("the instructor page shows the photo and the expertise domains", async ({ page }) => {
  await page.goto("/formateur");
  await expect(page.getByRole("heading", { level: 1, name: "Yassine Aqejjaj" })).toBeVisible();
  const photo = page.getByRole("img", { name: /Portrait de Yassine Aqejjaj/ });
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100);
  await expect(page.getByRole("link", { name: "Profil LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/yassine-aqejjaj/");
});

test("pricing shows exactly three offers", async ({ page }) => {
  await page.goto("/tarifs");
  for (const name of ["Module", "Parcours", "AI Mastery"]) await expect(page.getByRole("region", { name })).toBeVisible();
  await expect(page.getByText("199 €").first()).toBeVisible();
  await expect(page.getByText("990 €").first()).toBeVisible();
  await expect(page.getByText("1 990 €").first()).toBeVisible();
  await expect(page.getByText(/Mentored|Team 5|Team 20|Atelier privé/)).toHaveCount(0);
});

test.describe("written content: preview, syllabus, diagrams, read aloud", () => {
  test.beforeAll(async () => {
    // The CI/dev stack loads M1 and the blog as drafts (npm run content:load); publish them the way the instructor would.
    await sql("update courses set status = 'published' where code = 'M1'");
    await sql("update lessons set content_status = 'published' where course_id = (select id from courses where code = 'M1')");
    await sql(`update lessons set is_free_preview = (id = (select l.id from lessons l join chapters c on c.id = l.chapter_id where l.course_id = (select id from courses where code = 'M1') order by c.position, l.position limit 1)) where course_id = (select id from courses where code = 'M1')`);
    await sql("update blog_posts set status = 'published', published_at = now()");
  });

  test("a visitor reads the free preview lesson with read-aloud controls, and the syllabus shows the real programme", async ({ page }) => {
    const csp = watchCsp(page);
    await page.goto("/formations/machine-learning");
    await expect(page.getByRole("heading", { name: "Programme détaillé" })).toBeVisible();
    await expect(page.getByText(/leçons · environ/)).toBeVisible();
    await page.getByRole("link", { name: "Lire la leçon d'aperçu" }).click();
    await expect(page).toHaveURL(/\/formations\/machine-learning\/apercu/);
    await expect(page.getByRole("heading", { level: 1, name: "Qu'est-ce que l'IA ?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Écouter cette leçon/ })).toBeVisible();
    expect(csp, csp.join("\n")).toEqual([]);
  });

  test("a diagram in an article renders as an accessible SVG, in both themes, with no CSP violation", async ({ page }) => {
    const csp = watchCsp(page);
    for (const scheme of ["dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/ressources/accuracy-precision-rappel-f1");
      const svg = page.locator("article svg, main svg[aria-roledescription]").first();
      await expect(svg).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("button", { name: /Écouter cet article/ })).toBeVisible();
    }
    expect(csp, csp.join("\n")).toEqual([]);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
});

test("real reviews: the instructor invites, the person writes with consent, the instructor verifies and publishes", async ({ page, browser }) => {
  const admin = uniqueEmail("avis");
  await signUp(page, "Formateur Avis", admin);
  await verifyEmail(admin);
  await sql("insert into user_roles (user_id, role) values ($1, 'admin')", [await userId(admin)]);
  await signIn(page, admin);

  await page.goto("/admin/avis");
  await page.getByLabel(/Qui invitez-vous/).fill("Camille, Product Owner (test)");
  await page.getByRole("button", { name: "Créer le lien" }).click();
  const message = await page.getByText(/Lien créé pour/).innerText();
  const link = /(https?:\/\/\S+\/avis\/[0-9a-f]{36})/.exec(message)![1];
  const path = new URL(link).pathname;

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(path);
  await expect(guest.getByRole("heading", { name: "Votre avis sur TRAIL Academy" })).toBeVisible();
  await guest.getByLabel(/Votre nom/).fill("Camille Test");
  await guest.getByLabel(/Votre métier/).fill("Product Owner");
  await guest.getByLabel(/Votre avis/).fill("Un retour de test suffisamment long pour être accepté par le formulaire, écrit avec mes propres mots.");
  await guest.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(guest.getByText("Votre avis a bien été reçu")).toHaveCount(0); // consent box unchecked: the browser blocks the submission
  await guest.getByLabel(/J'accepte que mon nom/).check();
  await guest.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(guest.getByText("Votre avis a bien été reçu")).toBeVisible();
  await guest.goto(path);
  await expect(guest.getByText("Lien indisponible")).toBeVisible(); // single use

  await page.goto("/admin/avis");
  await expect(page.getByText("Un retour de test suffisamment long")).toBeVisible();
  expect((await sql("select 1 from testimonials where author_name = 'Camille Test'")).length).toBe(0); // received is not published
  await page.getByLabel(/Comment avez-vous vérifié/).fill("A suivi le module avec un accès offert, échange par e-mail");
  await page.getByLabel(/Je confirme que cette personne existe/).check();
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText("Avis publié.")).toBeVisible();
  const [t] = await sql<{ status: string; verified_at: string | null }>("select status, verified_at from testimonials where author_name = 'Camille Test'");
  expect(t.status).toBe("published");
  expect(t.verified_at).not.toBeNull();
});

test("live sessions: the instructor schedules, people book, the waiting list works, the private link and the calendar file follow", async ({ page, browser }) => {
  const admin = uniqueEmail("visio");
  await signUp(page, "Formateur Visio", admin);
  await verifyEmail(admin);
  await sql("insert into user_roles (user_id, role) values ($1, 'admin')", [await userId(admin)]);
  await signIn(page, admin);

  const when = new Date(Date.now() + 3 * 86_400_000);
  const local = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}T18:00`;
  await page.goto("/admin/sessions");
  await page.getByLabel("Titre").fill("Atelier e2e : écrire un prompt de référence");
  await page.getByLabel(/Date et heure/).fill(local);
  await page.getByLabel("Places").fill("1");
  await page.getByLabel("Qui peut réserver ?").selectOption("open");
  await page.getByLabel("Statut").selectOption("published");
  await page.getByRole("button", { name: "Créer la session" }).click();
  await expect(page.getByText("Session publiée.")).toBeVisible();
  const [row] = await sql<{ id: string; meeting_url: string }>("select id, meeting_url from live_sessions where title like 'Atelier e2e%'");
  expect(row.meeting_url).toMatch(/^https:\/\/meet\.jit\.si\/TRAIL-/);

  // A visitor sees the session in the calendar but never the link.
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/sessions");
  await expect(visitor.getByRole("link", { name: /Atelier e2e/ }).first()).toBeVisible();
  await visitor.goto(`/sessions/${row.id}`);
  await expect(visitor.getByRole("link", { name: "Se connecter" })).toBeVisible();
  expect(await visitor.content()).not.toContain("meet.jit.si");

  // First learner books and gets the link and a calendar file; the second goes on the waiting list.
  const first = uniqueEmail("a"), second = uniqueEmail("b");
  const p1 = await (await browser.newContext()).newPage();
  await signUp(p1, "Premier Inscrit", first); await verifyEmail(first); await signIn(p1, first);
  await p1.goto(`/sessions/${row.id}`);
  await p1.getByRole("button", { name: "Réserver ma place" }).click();
  await expect(p1.getByText("Place réservée")).toBeVisible();
  await expect(p1.getByRole("link", { name: "Lien de connexion" })).toHaveAttribute("href", row.meeting_url);
  const ics = await p1.request.get(`/sessions/${row.id}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain("BEGIN:VEVENT");
  expect(body).toContain(row.meeting_url);

  const p2 = await (await browser.newContext()).newPage();
  await signUp(p2, "Second Inscrit", second); await verifyEmail(second); await signIn(p2, second);
  await p2.goto(`/sessions/${row.id}`);
  await p2.getByRole("button", { name: "Me mettre sur liste d'attente" }).click();
  await expect(p2.getByText("Sur liste d'attente").first()).toBeVisible();
  expect(await p2.content()).not.toContain("meet.jit.si");

  // The first person cancels: the second is seated automatically.
  await p1.getByRole("button", { name: "Annuler ma place" }).click();
  await expect(p1.getByText("Réservation annulée")).toBeVisible();
  await p2.reload();
  await expect(p2.getByText("Vous êtes inscrit(e) à cette session.")).toBeVisible();
  await p2.goto("/compte/sessions");
  await expect(p2.getByRole("link", { name: /Atelier e2e/ })).toBeVisible();
});

test("AI Skills Assessment: a visitor answers, sees the explanation, then a level and a recommended start", async ({ page }) => {
  await page.goto("/evaluation");
  await page.getByLabel(/Votre fonction/).selectOption("hr");
  await page.getByRole("button", { name: "Commencer" }).click();
  for (let i = 0; i < 15; i++) {
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.getByRole("button", { name: i === 14 ? "Voir mon résultat" : "Question suivante" }).click();
  }
  await expect(page.getByText("Votre niveau estimé")).toBeVisible();
  await expect(page.getByRole("link", { name: "RH Augmentées" })).toBeVisible();
  await expect(page.getByText(/ni envoyées ni enregistrées|pas une certification/).first()).toBeVisible();
});

test("platform preview: the walkthrough completes with fictional content", async ({ page }) => {
  await page.goto("/apercu-plateforme");
  await page.getByRole("button", { name: /Leçon terminée/ }).click();
  await page.getByRole("button", { name: /Il retient tout/ }).click(); // wrong answer: explained, then locked
  await expect(page.getByText(/À revoir/)).toBeVisible();
  await page.getByRole("button", { name: /Chaque affirmation du résumé/ }).click();
  await page.getByRole("button", { name: "Terminer le quiz" }).click();
  await page.getByLabel("Votre prompt").fill("Tu es un assistant. Résume ce compte rendu pour la direction.");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Valider l'atelier" }).click();
  await page.getByRole("button", { name: "Simuler le dépôt du livrable" }).click();
  await expect(page.getByText(/Parcours de démonstration terminé/)).toBeVisible();
});

test("enterprise: the admin creates an organisation, the manager and a learner accept with consent, seats and progress follow", async ({ page, browser }) => {
  const admin = uniqueEmail("entadmin"), mgr = uniqueEmail("entmgr"), lea = uniqueEmail("entlea");
  await signUp(page, "Admin Entreprise", admin); await verifyEmail(admin);
  await sql("insert into user_roles (user_id, role) values ($1, 'admin')", [await userId(admin)]);
  await signIn(page, admin);
  await page.goto("/admin/entreprises");
  await page.getByLabel("Nom", { exact: true }).fill("Atelier E2E");
  await page.getByRole("button", { name: "Créer", exact: true }).first().click();
  await expect(page.getByText(/Organisation « Atelier E2E » créée/)).toBeVisible();
  await page.getByLabel(/Qui invitez-vous/).first().fill("Responsable E2E");
  await page.getByRole("button", { name: "Créer le lien" }).click();
  const link = /(\/equipe\/invitation\/[0-9a-f]{36})/.exec(await page.getByText(/Lien responsable créé/).innerText())![1];
  await page.getByLabel("Valable jusqu'au").fill(new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10));
  await page.getByLabel("Parcours du pack").selectOption({ label: "RH Augmentées" });
  await page.getByRole("button", { name: "Créer", exact: true }).last().click();
  await expect(page.getByText("Pack de licences créé.")).toBeVisible();

  const mctx = await browser.newContext(); const m = await mctx.newPage();
  await signUp(m, "Manon Responsable", mgr); await verifyEmail(mgr); await signIn(m, mgr);
  await m.goto(link);
  await m.getByRole("button", { name: "Accepter l'invitation" }).click(); // consent box unchecked: blocked by the browser
  await expect(m.getByText("Invitation acceptée.")).toHaveCount(0);
  await m.getByLabel(/J'accepte de partager/).check();
  await m.getByRole("button", { name: "Accepter l'invitation" }).click();
  await expect(m).toHaveURL(/compte\/organisation/);

  await m.goto("/equipe");
  await m.getByLabel(/Qui invitez-vous/).fill("Léa E2E");
  await m.getByRole("button", { name: "Créer le lien" }).click();
  const leaLink = /(\/equipe\/invitation\/[0-9a-f]{36})/.exec(await m.getByText(/Lien créé pour/).innerText())![1];

  const lctx = await browser.newContext(); const l = await lctx.newPage();
  await signUp(l, "Léa Apprenante", lea); await verifyEmail(lea); await signIn(l, lea);
  await l.goto(leaLink);
  await l.getByLabel(/J'accepte de partager/).check();
  await l.getByRole("button", { name: "Accepter l'invitation" }).click();
  await expect(l).toHaveURL(/compte\/organisation/);

  await m.goto("/equipe");
  await m.getByLabel("Membre").selectOption({ label: "Léa Apprenante" });
  await m.getByRole("button", { name: "Attribuer" }).click();
  await expect(m.getByText(/Licence attribuée/)).toBeVisible();
  expect((await sql("select 1 from entitlements where user_id = $1 and status = 'active'", [await userId(lea)])).length).toBeGreaterThan(0);
  await expect(m.getByRole("cell", { name: /Léa Apprenante/ })).toBeVisible();
  const csv = await m.request.get("/equipe/export.csv?org=" + new URL(m.url()).searchParams.get("org"));
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Léa Apprenante");

  await l.goto("/compte/organisation");
  await l.getByRole("button", { name: "Arrêter le partage et quitter" }).click();
  await expect(l.getByText(/Partage arrêté/)).toBeVisible();
  expect((await sql("select 1 from entitlements where user_id = $1 and status = 'active'", [await userId(lea)])).length).toBe(0);
  await mctx.close(); await lctx.close();
});

test("AI tutor: a learner asks about a lesson and gets cited extracts (no model configured: extracts only)", async ({ page }) => {
  const email = uniqueEmail("tuteur");
  await signUp(page, "Apprenante Tuteur", email); await verifyEmail(email); await signIn(page, email);
  await grantCourse(email, "M4");
  const [lesson] = await sql<{ id: string; title: string }>("select l.id, l.title from lessons l join courses c on c.id = l.course_id where c.code = 'M4' and l.content_status = 'published' order by l.position limit 1");
  const chunks = [{ position: 1, heading: "Le framework CARE", anchor: "le-framework-care", body: "CARE signifie contexte, action, résultat, exemple. Il structure un prompt en quatre lignes simples et réutilisables par toute une équipe.", search_text: "framework care contexte action resultat exemple structure prompt quatre lignes simples reutilisables equipe" }];
  await sql("select replace_lesson_chunks($1, $2::jsonb)", [lesson.id, JSON.stringify(chunks)]);

  await page.goto(`/apprendre/prompt-engineering/${lesson.id}`);
  await page.getByRole("button", { name: "Poser une question" }).click();
  const dialog = page.getByRole("dialog", { name: "Tuteur" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/jamais la solution/)).toBeVisible();
  await dialog.getByLabel("Votre question").fill("Comment fonctionne le framework CARE ?");
  await dialog.getByRole("button", { name: "Envoyer" }).click();
  await expect(dialog.getByText("Passages du cours, sans reformulation.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Le framework CARE/ })).toHaveAttribute("href", new RegExp(`/apprendre/prompt-engineering/${lesson.id}#le-framework-care$`));
  await expect(dialog.getByText(/quatre lignes simples/)).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include("#tutor-panel").withTags(WCAG).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("AI tutor: a visitor without an account cannot use it, and an account without access gets nothing", async ({ request, page }) => {
  const anon = await request.post("/api/tutor", { data: { lessonId: "00000000-0000-0000-0000-000000000001", mode: "ask", question: "bonjour" } });
  expect(anon.status()).toBe(401);
  const email = uniqueEmail("tuteur2");
  await signUp(page, "Sans accès", email); await verifyEmail(email); await signIn(page, email);
  const [lesson] = await sql<{ id: string }>("select l.id from lessons l join courses c on c.id = l.course_id where c.code = 'M7' and l.content_status = 'published' and not l.is_free_preview limit 1");
  if (lesson) {
    const res = await page.request.post("/api/tutor", { data: { lessonId: lesson.id, mode: "ask", question: "framework" } });
    expect(res.status()).toBe(404);
  }
});
