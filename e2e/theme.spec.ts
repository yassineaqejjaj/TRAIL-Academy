import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { grantCourse, signIn, signOut, signUp, sql, uniqueEmail, verifyEmail } from "./helpers";

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const saved = (page: Page) => page.evaluate(() => localStorage.getItem("theme"));
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const toLight = (page: Page) => page.getByRole("button", { name: "Activer le thème clair" }).first();
const toDark = (page: Page) => page.getByRole("button", { name: "Activer le thème sombre" }).first();

function watchHydration(page: Page): string[] {
  const seen: string[] = [];
  page.on("console", (m) => { if (/hydrat|did not match|server rendered HTML/i.test(m.text())) seen.push(m.text()); });
  page.on("pageerror", (e) => { if (/hydrat/i.test(e.message)) seen.push(e.message); });
  return seen;
}

test("a new visitor gets the dark theme, switches to light, back to dark, instantly and without reloading", async ({ page }) => {
  const hydration = watchHydration(page);
  await page.goto("/");
  expect(await theme(page)).toBe("dark");
  expect(await saved(page)).toBeNull();
  expect(await bodyBg(page)).toBe("rgb(5, 13, 28)");
  await page.evaluate(() => { (window as unknown as { __marker: number }).__marker = 1; });

  await toLight(page).click();
  expect(await theme(page)).toBe("light");
  expect(await saved(page)).toBe("light");
  await expect.poll(() => bodyBg(page)).toBe("rgb(250, 248, 244)");
  await expect(toDark(page)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1); // no page reload
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await expect(page.locator(".logo-light").first()).toBeVisible();
  await expect(page.locator(".logo-dark").first()).toBeHidden();

  await toDark(page).click();
  expect(await theme(page)).toBe("dark");
  expect(await saved(page)).toBe("dark");
  await expect.poll(() => bodyBg(page)).toBe("rgb(5, 13, 28)");
  await expect(page.locator(".logo-dark").first()).toBeVisible();
  expect(hydration, hydration.join("\n")).toEqual([]);
});

test("the choice follows the visitor across pages, a reload and a reopened browser, with no flash of the other theme", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hydration = watchHydration(page);
  await page.goto("/");
  await toLight(page).click();

  await page.getByRole("link", { name: "Formations", exact: true }).first().click();
  await page.waitForURL(/\/formations$/);
  expect(await theme(page)).toBe("light");
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("light"); // already right at DOMContentLoaded: the saved choice is applied before first paint
  expect(await bodyBg(page)).toBe("rgb(250, 248, 244)");

  const state = await ctx.storageState(); // what a browser keeps when it is closed
  await ctx.close();
  const reopened = await browser.newContext({ storageState: state });
  const p2 = await reopened.newPage();
  await p2.goto("/tarifs", { waitUntil: "domcontentloaded" });
  expect(await theme(p2)).toBe("light");
  await expect(toDark(p2)).toBeVisible();
  await toDark(p2).click();
  await p2.goto("/faq", { waitUntil: "domcontentloaded" });
  expect(await theme(p2)).toBe("dark");
  await reopened.close();
  expect(hydration, hydration.join("\n")).toEqual([]);
});

test("a corrupted or blocked saved value falls back to dark", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("theme", "<script>"); } catch { /* ignore */ } });
  await page.goto("/");
  expect(await theme(page)).toBe("dark");
});

test("the toggle works on a phone: reachable, large enough, usable with the keyboard", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  const button = toLight(page);
  const box = await button.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await button.focus();
  await page.keyboard.press("Enter");
  expect(await theme(page)).toBe("light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); // no horizontal scroll
  await ctx.close();
});

test("signed-in areas follow the same global choice: account, lesson reader, administration", async ({ page }) => {
  const learner = uniqueEmail("theme");
  await signUp(page, "Apprenante Thème", learner); await verifyEmail(learner); await signIn(page, learner);
  await grantCourse(learner, "M4");
  const [lesson] = await sql<{ id: string }>("select l.id from lessons l join courses c on c.id = l.course_id where c.code = 'M4' and l.content_status = 'published' order by l.position limit 1");

  await page.goto("/compte");
  await toLight(page).click();
  await page.goto(`/apprendre/prompt-engineering/${lesson.id}`);
  expect(await theme(page)).toBe("light");
  await expect(toDark(page)).toBeVisible(); // the reader header carries the switch too
  await page.getByRole("button", { name: "Poser une question" }).click();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

  await page.goto("/compte");
  await signOut(page);
  const admin = uniqueEmail("themeadmin");
  await signUp(page, "Admin Thème", admin); await verifyEmail(admin);
  await sql("insert into user_roles (user_id, role) values ((select id from auth.users where email = $1), 'admin')", [admin]);
  await signIn(page, admin);
  await page.goto("/admin");
  expect(await theme(page)).toBe("light");
  await expect(page.getByRole("button", { name: "Activer le thème sombre" })).toBeVisible();
});
