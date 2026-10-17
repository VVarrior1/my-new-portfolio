// Re-captures the product screenshots in public/work at retina resolution.
// public/work/cyd-venue-picker.jpg is not captured here: it comes from the CYD case study repo
// (screenshots/venue-picker.png, top 1110 px), because reaching that step means filling in the
// registration form, and that would send real lead emails and texts.
//   node scripts/capture-work-shots.mjs            # every shot
//   ONLY=systemlab-lesson node scripts/capture-work-shots.mjs
// Uses the installed Google Chrome through playwright-core (already a dev dependency
// via @playwright/test). Set CHROME_PATH to use a different browser. Requires macOS
// `sips` to convert PNG to JPEG.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/work/", import.meta.url).pathname;
const TMP = mkdtempSync(join(tmpdir(), "work-shots-"));

const shots = [
  { url: "https://cydsoccer.com/register/programs", file: "cyd-register-phone", width: 390, height: 844, mobile: true },
  {
    url: "https://system-design-playground-pi.vercel.app/learn/find-the-bottleneck",
    file: "systemlab-lesson",
    // A 1320 viewport keeps the architecture canvas about 780 CSS px wide, so at the size the
    // site shows it (about 600 px) the node labels stay readable.
    width: 1320,
    height: 1000,
    run: true,
    // Zoom the canvas about 10% (a wheel step over its centre) so the components fill more of it.
    wheel: -70,
    // Only the architecture canvas and the headline metrics under it: no sidebar, no lesson
    // text and no green call to action.
    crop: async (page) =>
      page.evaluate(() => {
        const leaf = (text) => [...document.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent.trim() === text);
        const canvas = document.querySelector(".react-flow").getBoundingClientRect();
        const top = leaf("Architecture").getBoundingClientRect().top - 11;
        const metric = leaf("P95 LATENCY").getBoundingClientRect().top;
        return { x: canvas.x, y: top, width: canvas.width, height: metric + 46 - top };
      }),
  },
];

const only = process.env.ONLY;
const browser = await chromium.launch({ executablePath: CHROME });
for (const shot of shots.filter((s) => !only || s.file === only)) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.mobile ? 3 : 2,
    isMobile: !!shot.mobile,
    hasTouch: !!shot.mobile,
  });
  await page.goto(shot.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // Dismiss announcement bars and hide floating widgets pinned to the bottom of the screen.
  const close = page.locator('button[aria-label*="lose" i], button[aria-label*="ismiss" i]').first();
  if (await close.count()) await close.click().catch(() => {});
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.position === "fixed" && el.getBoundingClientRect().top > innerHeight / 2) el.style.display = "none";
    }
  });
  if (shot.run) {
    const run = page.getByRole("button", { name: /Run simulation/i }).first();
    if (await run.count()) {
      await run.click();
      await page.waitForTimeout(6000);
    }
  }
  if (shot.wheel) {
    const box = await page.locator(".react-flow").first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, shot.wheel);
    await page.waitForTimeout(800);
    // Park the pointer away from the canvas so no hover state is captured.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
  }
  const clip = shot.crop ? await shot.crop(page) : shot.clip;
  const png = join(TMP, `${shot.file}.png`);
  await page.screenshot({ path: png, clip });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", png, "--out", join(OUT, `${shot.file}.jpg`)]);
  console.log("saved", `public/work/${shot.file}.jpg`, clip ? `${Math.round(clip.width)}x${Math.round(clip.height)} CSS px` : "");
  await page.close();
}
await browser.close();
console.log("Update width/height in lib/content.ts if the image sizes changed.");
