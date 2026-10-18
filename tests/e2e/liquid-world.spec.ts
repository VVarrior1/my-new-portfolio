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

  test("the hero's name flies into the header's wordmark and back", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator(".hud-name-ltr")).toHaveCount(18); // Abdelrahman + Mohamed
    const firstOfName = page.locator("[data-name] [data-nl]").first();
    const wordmarkA = page.locator("[data-wordmark] [data-wl]").first();
    await expect(wordmarkA).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(wordmarkA).toHaveCSS("opacity", "1");
    await expect(firstOfName).toHaveCSS("visibility", "hidden");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(firstOfName).toHaveCSS("visibility", "visible");
    await expect(wordmarkA).toHaveCSS("opacity", "0");
  });

  test("the packet is delivered beside Email me at the bottom of the page", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const packet = page.locator(".packet");
    await expect(packet).toHaveAttribute("data-delivered", "");
    await expect(packet.locator("[data-route]")).toHaveText("/contact");
    await expect(packet.locator("[data-method]")).toHaveText("200");
    // It sits level with the key it delivers to.
    const key = await page.locator("[data-terminal]").boundingBox();
    const capsule = await packet.locator(".packet-capsule").boundingBox();
    expect(Math.abs(capsule!.y + capsule!.height / 2 - (key!.y + key!.height / 2))).toBeLessThan(12);
  });

  test("the docked names never sit on the portrait, and step aside for the ruler's map", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    const overlaps = () =>
      page.evaluate(() => {
        const p = document.querySelector("[data-hud-avoid]")!.getBoundingClientRect();
        return Array.from(document.querySelectorAll(".hud-ltr"))
          .filter((el) => Number(getComputedStyle(el).opacity) > 0.05)
          .map((el) => el.getBoundingClientRect())
          .filter((l) => l.left < p.right && l.right > p.left && l.top < p.bottom && l.bottom > p.top).length;
      });
    expect(await overlaps()).toBe(0);
    await page.mouse.move(1415, 450);
    await expect.poll(() => page.evaluate(() => Math.max(...Array.from(document.querySelectorAll(".hud-ltr")).map((el) => Number(getComputedStyle(el).opacity))))).toBeLessThan(0.05);
    await expect.poll(() => page.locator(".hud-mapword").first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
  });

  test("on a phone, section titles fly into the bar under the header", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => sessionStorage.setItem("intro", "1"));
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator(".mhud-fly").first()).toBeAttached();
    await page.evaluate(() => {
      const title = document.getElementById("work-title")!;
      window.scrollTo(0, title.getBoundingClientRect().top + window.scrollY - 40);
    });
    await expect(page.locator(".mhud-bar")).toHaveCSS("opacity", "1");
    await expect(page.locator("#work-title [data-tl]").first()).toHaveAttribute("data-away", "");
    const box = await page.locator(".mhud-fly").first().boundingBox();
    expect(box!.y).toBeLessThan(110);
    await expect(page.locator(".hud-ltr")).toHaveCount(0);
    await context.close();
  });

  test("on a touch screen, tapping a row never leaves it filled", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => sessionStorage.setItem("intro", "1"));
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("load");
    const row = page.locator("#writing .tide-row a").first();
    await row.scrollIntoViewIfNeeded();
    await row.evaluate((el) => el.addEventListener("click", (e) => e.preventDefault(), { once: true }));
    await row.tap();
    await page.waitForTimeout(700);
    expect(await page.locator("#writing .tide-row[data-tide]").count()).toBe(0);
    await context.close();
  });
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

  for (const scheme of ["light", "dark"] as const) {
    test(`the inverted chapter is readable when it is scrolled to (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scheme });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        const e = document.getElementById("experience")!;
        window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY + 200);
      });
      await page.waitForTimeout(1200);
      const title = page.locator("#experience .t-role").first();
      const box = (await title.boundingBox())!;
      const color = await title.evaluate((el) => getComputedStyle(el).color);
      // The ground just right of the role's name, as painted (the liquid's still frame included).
      const shot = await page.screenshot({ clip: { x: Math.round(box.x + box.width + 12), y: Math.round(box.y), width: 40, height: Math.round(box.height) } });
      const ratio = await page.evaluate(
        async ({ data, color }) => {
          const img = new Image();
          img.src = "data:image/png;base64," + data;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext("2d")!;
          g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let r = 0, gg = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i];
            gg += d[i + 1];
            b += d[i + 2];
          }
          const n = d.length / 4;
          const lum = (rgb: number[]) => {
            const [R, G, B] = rgb.map((v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * R + 0.7152 * G + 0.0722 * B;
          };
          const text = color.match(/\d+/g)!.slice(0, 3).map(Number);
          const a = lum(text);
          const bg = lum([r / n, gg / n, b / n]);
          return (Math.max(a, bg) + 0.05) / (Math.min(a, bg) + 0.05);
        },
        { data: shot.toString("base64"), color },
      );
      expect(ratio).toBeGreaterThan(4.5);
    });
  }

  test("the spine is a finished drawing: lit, with the packet delivered", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    const packet = page.locator(".packet");
    await expect(packet).toHaveAttribute("data-rest", "");
    await expect(packet).toHaveAttribute("data-delivered", "");
    await expect(packet.locator("[data-method]")).toHaveText("200");
  });
});
