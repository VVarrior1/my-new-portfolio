import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("shows the name, the flagship project and a way to get in touch", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Abdelrahman");
    await expect(page.getByRole("heading", { name: "CYD Soccer Academy platform" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Systemlab" })).toBeVisible();
    await expect(page.getByText("ApplyOps")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Email me" }).first()).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByRole("link", { name: /^Résumé/ }).first()).toHaveAttribute("href", "/Abdelrahman_Mohamed_Resume.pdf");
  });

  test("the hero simulator reacts to traffic, servers and the cache", async ({ page }) => {
    await page.goto("/");
    const sim = page.getByRole("figure").filter({ hasText: "A small system you can break" });
    const hint = sim.locator("p[aria-live]");
    await expect(hint).toContainText("Healthy");

    await sim.getByRole("slider").focus();
    for (let i = 0; i < 44; i++) await page.keyboard.press("ArrowRight"); // 160 -> 600 req/s
    await expect(sim.getByText("600 requests/s")).toBeVisible();
    await expect(hint).toContainText("app servers are saturated", { timeout: 8000 });

    await sim.getByRole("button", { name: "Add a server" }).click();
    await sim.getByRole("button", { name: "Add a server" }).click();
    await sim.getByRole("switch").click();
    await expect(hint).toContainText("Healthy", { timeout: 10000 });

    await sim.getByRole("button", { name: "Kill a server" }).click();
    await expect(sim.getByRole("button", { name: /^Restart app \d$/ })).toBeVisible();
  });

  test("opens the command menu with the keyboard and finds the résumé", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Command menu" });
    await expect(dialog).toBeVisible();
    await page.keyboard.type("resume");
    await expect(dialog.getByRole("option", { name: /Open the résumé/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("enlarges a project screenshot", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Enlarge screenshots of Systemlab/ }).click();
    const dialog = page.getByRole("dialog", { name: "Systemlab" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
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
    // With nothing counted yet (a fresh store, or a local run) the page says so instead of charting zeros.
    await expect(page.getByRole("heading", { name: /^(Page views per day, last 30 days|Nothing counted yet)$/ })).toBeVisible();
  });
});
