import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

// axe-core ships with the lint toolchain (eslint-plugin-jsx-a11y), so it's already installed.
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

/** Skip the once-per-tab intro, so a test starts on the page itself. */
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("intro", "1");
    } catch {}
  });
}

test.describe("liquid world", () => {
  test("the intro plays on the first view of the home page in a tab, and not again", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-intro", "");
    await expect(page.locator(".intro")).toBeHidden({ timeout: 4000 });
    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/);
  });

  test("section names fly into the corner as their section arrives", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => ((window as unknown as { __hudNoSnap: boolean }).__hudNoSnap = true));
    await page.goto("/");
    const letters = page.locator('.hud-ltr[data-entry="0"]');
    await expect(letters).toHaveCount(4); // W O R K
    // Waiting in the queue: small, sideways, at the bottom right.
    const before = await letters.first().boundingBox();
    expect(before!.y).toBeGreaterThan(450);
    await page.evaluate(() => {
      const work = document.getElementById("work")!;
      window.scrollTo(0, work.getBoundingClientRect().top + window.scrollY - 40);
    });
    await expect
      .poll(async () => {
        const box = await letters.first().boundingBox();
        return box ? box.y : 9999;
      })
      .toBeLessThan(200);
    const docked = await letters.last().boundingBox();
    expect(docked!.x).toBeGreaterThan(1100);
    // Docked, and readable (it may already have shrunk into the breadcrumb under SYSTEMLAB).
    expect(Number(await letters.first().evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.3);
  });

  test("the résumé chapter is set in the opposite theme", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    const color = (id: string) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).color);
    expect(await color("experience-title")).not.toBe(await color("work-title"));
    await expect(page.locator('[data-chapter="invert"]')).toHaveCount(1);
  });

  test("the simulator's packet reports a 503 once you break it", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const sim = page.getByRole("figure").filter({ hasText: "A small system you can break" });
    await sim.getByRole("slider").focus();
    for (let i = 0; i < 74; i++) await page.keyboard.press("ArrowRight");
    await sim.getByRole("button", { name: "Kill a server" }).click();
    await expect(page.locator(".packet")).toHaveAttribute("data-state", "failing", { timeout: 10000 });
    await expect(page.locator(".packet [data-method]")).toHaveText("503");
  });

  for (const width of [390, 1024, 1440]) {
    test(`nothing overflows sideways at ${width}px`, async ({ page }) => {
      await skipIntro(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("load");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`axe finds no violations in the ${scheme} theme`, async ({ page }) => {
      await skipIntro(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("load");
      // Let every reveal run, so nothing is checked mid-fade.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 600) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(1200);
      await page.addScriptTag({ path: AXE });
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (d: Document, o: object) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }> } }).axe;
        const result = await axe.run(document, { resultTypes: ["violations"] });
        return result.violations.map((v) => `${v.id} (${v.nodes.length})`);
      });
      expect(violations).toEqual([]);
    });
  }
});

test.describe("liquid world, reduced motion", () => {
  test("is complete and still: no HUD, no custom cursor, the personal list in plain view", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/);
    await expect(page.locator(".hud-ltr")).toHaveCount(0);
    await expect(page.locator(".cursor-ring")).toHaveCount(0);
    await expect(page.locator(".marquee")).toBeHidden();
    await expect(page.locator(".offclock-list").getByText("Bullet, rated")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Experience" })).toHaveCSS("opacity", "1");
  });
});
