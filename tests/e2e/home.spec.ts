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

test.describe("scroll choreography", () => {
  test("the section names fly to the top-right corner as their sections arrive", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hud", "on");
    const letters = page.locator('.hud-letter[data-word="0"]');
    await expect(letters).toHaveCount(4); // W O R K
    // Before Work arrives its name waits on deck, low on the right.
    const before = await letters.first().boundingBox();
    expect(before!.y).toBeGreaterThan(400);
    await page.locator("#experience").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.getElementById("work")!.getBoundingClientRect().top + window.scrollY));
    await expect.poll(async () => (await letters.first().boundingBox())!.y, { timeout: 8000 }).toBeLessThan(140);
  });

  test("the packet rides the spine, lights stations and is delivered at the contact section", async ({ page }) => {
    await page.goto("/");
    const packet = page.locator(".packet");
    await expect(packet).toHaveAttribute("data-on", "");
    const station = page.locator('#work .station');
    await expect(station).not.toHaveAttribute("data-lit", "");
    await page.evaluate(() => window.scrollTo(0, document.getElementById("experience")!.getBoundingClientRect().top + window.scrollY));
    await expect(station).toHaveAttribute("data-lit", "", { timeout: 8000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator("[data-terminal]")).toHaveAttribute("data-delivered", "", { timeout: 8000 });
    await expect(packet.locator("[data-method]")).toHaveText(/200|503/);
  });

  test("the packet turns to 503 when the simulator fails requests", async ({ page }) => {
    await page.goto("/");
    const sim = page.getByRole("figure").filter({ hasText: "A small system you can break" });
    await sim.getByRole("slider").focus();
    for (let i = 0; i < 70; i++) await page.keyboard.press("ArrowRight");
    await sim.getByRole("button", { name: "Kill a server" }).click();
    await expect(page.locator(".packet")).toHaveAttribute("data-state", "failing", { timeout: 15000 });
    await expect(page.locator(".packet [data-method]")).toHaveText("503");
  });

  for (const width of [390, 1024, 1440]) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      for (const y of [0, 2000, 4000, 6000, 100000]) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("reduced motion", () => {
  test("is a finished drawing: no rail, the plain personal list, the packet delivered", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".packet")).toHaveAttribute("data-delivered", "");
    await expect(page.locator("html")).not.toHaveAttribute("data-hud", "on");
    await expect(page.locator(".marquee")).toBeHidden();
    await expect(page.locator(".offclock-list").getByText("Bullet, rated")).toBeVisible();
    await expect(page.locator(".section-word").first()).toBeVisible();
  });

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
