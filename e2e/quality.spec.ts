import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, signUp, sql, uniqueEmail, userId, verifyEmail } from "./helpers";

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

const PUBLIC = ["/", "/formations", "/formations/prompt-engineering", "/parcours", "/tarifs", "/entreprise", "/formateur", "/conseiller", "/ressources", "/connexion", "/inscription", "/legal/mentions-legales", "/legal/confidentialite"];

test.describe("accessibility (axe, WCAG 2.2 AA) and CSP on public pages", () => {
  for (const scheme of ["light", "dark"] as const) {
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
  for (const path of ["/compte", "/compte/commandes", "/compte/donnees", "/admin", "/admin/cours", "/admin/produits", "/admin/production"]) {
    for (const scheme of ["light", "dark"] as const) found.push(...(await audit(page, path, scheme)));
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
    for (const scheme of ["light", "dark"] as const) {
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
