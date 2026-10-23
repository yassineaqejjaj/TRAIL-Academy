import { expect, test } from "@playwright/test";

test("visitor browses the catalog and a course", async ({ page }) => {
  await page.goto("/formations");
  await expect(page.getByRole("heading", { name: "Catalogue des formations" })).toBeVisible();
  await page.getByLabel("Recherche").fill("prompt");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await page.getByRole("link", { name: "Prompt Engineering" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Prompt Engineering" })).toBeVisible();
});

test("unpublished course cannot be purchased", async ({ page }) => {
  await page.goto("/formations/prompt-engineering");
  await expect(page.getByText("Bientôt disponible")).toBeVisible();
  await expect(page.getByRole("link", { name: "Acheter ce module" })).toHaveCount(0);
});

test("advisor recommends a path", async ({ page }) => {
  await page.goto("/conseiller");
  await page.getByRole("button", { name: "Obtenir ma recommandation" }).click();
  await expect(page.getByText("Parcours recommandé")).toBeVisible();
});

test("private areas redirect anonymous visitors", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/connexion/);
});
