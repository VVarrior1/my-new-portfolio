// Re-captures the product screenshots in public/work at retina resolution.
// public/work/cyd-venue-picker.jpg is not captured here: it comes from the CYD case study repo
// (screenshots/venue-picker.png, top 1110 px), because reaching that step means filling in the
// registration form, and that would send real lead emails and texts.
//   node scripts/capture-work-shots.mjs            (every shot)
//   node scripts/capture-work-shots.mjs systemlab  (only files whose name contains "systemlab")
// Uses the installed Google Chrome through playwright-core (already a dev dependency
// via @playwright/test). Set CHROME_PATH to use a different browser. Requires macOS
// `sips` to convert PNG to JPEG.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.OUT_DIR ?? new URL("../public/work/", import.meta.url).pathname;
const TMP = mkdtempSync(join(tmpdir(), "work-shots-"));

const shots = [
  { url: "https://cydsoccer.com/register/programs", file: "cyd-register-phone", width: 390, height: 844, mobile: true },
  {
    url: "https://system-design-playground-pi.vercel.app/learn/find-the-bottleneck",
    file: "systemlab-lesson",
    width: 1280,
    height: 800,
    run: true,
    // A little canvas zoom (one wheel notch, about 1.15x) around the components, so they fill the crop.
    wheelZoom: { x: 928, y: 465, deltaY: -100 },
    // The architecture canvas and the first row of run metrics, in CSS pixels. A tight crop, so the
    // app's 12px labels are still readable when the frame is ~600px wide on the home page.
    clip: { x: 509, y: 200, width: 740, height: 601 },
    // Systemlab has no dark theme, so the dark-mode copy is the same run inverted (images and
    // canvases are flipped back), captured from the same page so the two line up exactly.
    dark: "systemlab-lesson-dark",
  },
];

const DARK_CSS = `
  html { filter: invert(0.9) hue-rotate(180deg) saturate(0.85); background: #fff; }
  img, video, canvas, picture { filter: invert(1) hue-rotate(180deg); }
`;
const only = process.argv[2];
const browser = await chromium.launch({ executablePath: CHROME });
for (const shot of shots.filter((s) => !only || s.file.includes(only))) {
  // The simulation runs in a Web Worker that sometimes fails to load on a cold start, so a run
  // is retried until it produces numbers (the p95 readout stops being a dash).
  for (let attempt = 1; attempt <= 4; attempt++) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: shot.mobile ? 3 : 2,
      isMobile: !!shot.mobile,
      hasTouch: !!shot.mobile,
    });
    await page.goto(shot.url, { waitUntil: "load", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
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
    let ok = true;
    if (shot.run) {
      const run = page.getByRole("button", { name: /Run simulation/i }).first();
      if (await run.count()) {
        await run.click();
        await page.waitForTimeout(6000);
      }
      if (shot.wheelZoom) {
        await page.mouse.move(shot.wheelZoom.x, shot.wheelZoom.y);
        await page.mouse.wheel(0, shot.wheelZoom.deltaY);
        await page.waitForTimeout(800);
      }
      ok = await page.evaluate(
        () => !/failed to load/i.test(document.body.innerText) && /P95 LATENCY\s*[\d,.]+/i.test(document.body.innerText),
      );
    }
    if (!ok) {
      console.log(`${shot.file}: the run produced no numbers, retrying (${attempt}/4)`);
      await page.close();
      continue;
    }
    const png = join(TMP, `${shot.file}.png`);
    await page.screenshot({ path: png, clip: shot.clip, fullPage: !!shot.clip });
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", png, "--out", join(OUT, `${shot.file}.jpg`)]);
    console.log("saved", `public/work/${shot.file}.jpg`);
    if (shot.dark) {
      await page.addStyleTag({ content: DARK_CSS });
      await page.waitForTimeout(300);
      const darkPng = join(TMP, `${shot.dark}.png`);
      await page.screenshot({ path: darkPng, clip: shot.clip, fullPage: !!shot.clip });
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", darkPng, "--out", join(OUT, `${shot.dark}.jpg`)]);
      console.log("saved", `public/work/${shot.dark}.jpg`);
    }
    await page.close();
    break;
  }
}
await browser.close();
console.log("Update width/height in lib/content.ts if the image sizes changed.");
