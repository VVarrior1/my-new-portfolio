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

  test("the hero shows his portrait beside the name, and the photo appears once on the page", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("intro", "1");
      } catch {}
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const portrait = page.locator("[data-hero-portrait] img");
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveAttribute("alt", /Abdelrahman Mohamed/);
    const name = await page.getByRole("heading", { level: 1 }).boundingBox();
    const photo = await portrait.boundingBox();
    // On the right of the name, a modest frame rather than a slab, inside the first screen.
    expect(photo!.x).toBeGreaterThan(name!.x + name!.width);
    expect(photo!.width).toBeLessThanOrEqual(360);
    expect(photo!.y + photo!.height).toBeLessThan(900);
    // Contact doesn't show the same photo again.
    await expect(page.locator('img[src*="portrait-snow"], img[srcset*="portrait-snow"]')).toHaveCount(1);
    // The hero simulator is gone; the Systemlab entry still links to the live app.
    await expect(page.getByText("A small system you can break")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Try it/ })).toHaveAttribute("href", /^https:\/\/system-design-playground/);
  });

  test("on a phone the portrait sits small above the name, and the hero fits the screen", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/");
    const photo = await page.locator("[data-hero-portrait] img").boundingBox();
    const name = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(photo!.width).toBeLessThanOrEqual(112);
    expect(photo!.y + photo!.height).toBeLessThan(name!.y);
    const hero = await page.locator("#top").boundingBox();
    expect(hero!.height).toBeLessThanOrEqual(844);
    await context.close();
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
    // Playwright sets navigator.webdriver, which the tracker skips on purpose; look like a person here.
    await page.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
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

test.describe("reduced motion", () => {
  test("shows everything without waiting on an animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Reveals only hide content once motion is on, so nothing below the fold is waiting to fade in.
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "on");
    const title = page.getByRole("heading", { level: 2, name: "Experience" });
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS("opacity", "1");
    // The liquid, if WebGL is available, is a single still frame.
    const field = page.locator("canvas.liquid-field");
    await expect(field).toHaveCount(1);
    const ready = await field.getAttribute("data-ready");
    expect(ready === null || ready === "still").toBe(true);
  });
});
