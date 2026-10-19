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

  test("the hero indexes three projects, each linking to its entry in Work", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("intro", "1");
      } catch {}
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const index = page.getByRole("navigation", { name: "Selected work" });
    const rows = index.getByRole("link");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Systemlab");
    await expect(rows.nth(0)).toContainText("70 lessons");
    await expect(rows.nth(1)).toContainText("~300 families");
    for (const href of await rows.evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
      expect(href).toMatch(/^#/);
      await expect(page.locator(href!)).toHaveCount(1);
    }
    // At rest the first row is the river's source and no preview shows.
    await expect(rows.nth(0)).toHaveAttribute("data-active", "");
    const shots = page.locator(".hero-preview-shot");
    await expect(page.locator(".hero-preview-shot[data-on]")).toHaveCount(0);
    // Pointing at a row makes it the source and shows its screenshot; leaving hands it back.
    await rows.nth(1).hover();
    await expect(rows.nth(1)).toHaveAttribute("data-active", "");
    await expect(rows.nth(0)).not.toHaveAttribute("data-active", /.*/);
    await expect(shots.nth(1)).toHaveAttribute("data-on", "");
    // (Read without its fade, so a busy machine can't catch it mid-transition.)
    const settled = (i: number) => shots.nth(i).evaluate((el) => ((el as HTMLElement).style.transition = "none", Number(getComputedStyle(el).opacity)));
    expect(await settled(1)).toBe(1);
    expect(await settled(0)).toBe(0);
    await page.mouse.move(5, 450);
    await expect(rows.nth(0)).toHaveAttribute("data-active", "");
    await expect(shots.nth(1)).not.toHaveAttribute("data-on", /.*/);
    // A row takes you to the project, whose own links still go to the live app.
    await rows.nth(0).click();
    // It lands just under the header (the header's height plus the entry's scroll margin).
    await expect.poll(() => page.locator("#work-systemlab").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(200);
    expect(await page.locator("#work-systemlab").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(40);
    await expect(page.locator("#work-systemlab").getByRole("link", { name: /Try it/ })).toHaveAttribute("href", "https://system-design-playground-pi.vercel.app");
  });

  test("on a phone the index is a plain list under the copy, with no preview", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto("/");
    const index = page.getByRole("navigation", { name: "Selected work" });
    await expect(index.getByRole("link")).toHaveCount(3);
    await expect(page.locator(".hero-preview")).toBeHidden();
    const intro = await page.locator("[data-name]").boundingBox();
    const list = await index.boundingBox();
    expect(list!.y).toBeGreaterThan(intro!.y + intro!.height);
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
