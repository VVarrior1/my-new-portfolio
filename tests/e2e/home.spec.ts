import { test, expect } from "@playwright/test";

test.describe("homepage", () => {
  test("renders hero and contact CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Abdelrahman Mohamed");
    await expect(page.getByRole("heading", { name: /Projects with measurable impact/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start a project/i })).toBeVisible();
  });
});
