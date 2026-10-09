import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("shows the name, the flagship project and a way to get in touch", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Abdelrahman");
    await expect(page.getByRole("heading", { name: "CYD Soccer Academy platform" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Email me" })).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByRole("link", { name: "Résumé (PDF)" }).first()).toHaveAttribute("href", "/Abdelrahman_Mohamed_Resume.pdf");
  });

  test("replays the sign-up trace", async ({ page }) => {
    await page.goto("/");
    const trace = page.getByRole("figure");
    await expect(trace.getByRole("listitem")).toHaveCount(7);
    await expect(trace.getByRole("listitem").last()).toContainText("TeamSnap");
    await trace.getByRole("button", { name: "Replay" }).click();
    await expect(trace.getByRole("listitem")).toHaveCount(7);
  });

  test("remembers the chosen theme", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /Switch to (dark|light) theme/ }).first();
    const before = await toggle.getAttribute("aria-label");
    await toggle.click();
    const expected = before?.includes("dark") ? "dark" : "light";
    await expect(html).toHaveAttribute("data-theme", expected);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", expected);
  });

  test("sends a page view with the ?ref= tag", async ({ page }) => {
    const sent = page.waitForRequest((request) => request.url().endsWith("/api/analytics/track") && request.method() === "POST");
    await page.goto("/?ref=resume");
    const body = JSON.parse((await sent).postData() ?? "{}");
    expect(body).toEqual({ type: "view", path: "/", referrer: "ref:resume" });
  });
});

test.describe("other pages", () => {
  test("lists posts and opens one", async ({ page }) => {
    await page.goto("/blogs");
    await expect(page.getByRole("heading", { level: 1, name: "Writing" })).toBeVisible();
    await page.locator('main a[href^="/blogs/"]').first().click();
    await expect(page).toHaveURL(/\/blogs\/.+/);
    await expect(page.getByRole("link", { name: "All writing" })).toBeVisible();
  });

  test("shows site stats", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByRole("heading", { level: 1, name: "Site stats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page views per day, last 30 days" })).toBeVisible();
  });
});
