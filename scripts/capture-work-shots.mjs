// Re-captures the product screenshots in public/work at retina resolution.
// public/work/cyd-venue-picker.jpg is not captured here: it comes from the CYD case study repo
// (screenshots/venue-picker.png, top 1110 px), because reaching that step means filling in the
// registration form, and that would send real lead emails and texts.
//   node scripts/capture-work-shots.mjs              (all of them)
//   node scripts/capture-work-shots.mjs systemlab    (only files whose name contains "systemlab")
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
    width: 1440,
    height: 900,
    run: true,
    // The lesson area without the sidebar, in CSS pixels. It ends on the canvas panel's bottom edge,
    // just above the Overview tabs, so the crop lands on a real boundary instead of mid-row.
    clip: { x: 226, y: 105, width: 1200, height: 583 },
    // Systemlab has no dark theme, so the dark-mode copy is the same page inverted (photos and
    // canvases are flipped back). It sits next to the dark page without glaring.
    dark: "systemlab-lesson-dark",
  },
];

const DARK_CSS = `
  html { filter: invert(0.9) hue-rotate(180deg) saturate(0.85); background: #fff; }
  img, video, canvas, picture { filter: invert(1) hue-rotate(180deg); }
`;
const only = process.argv[2];

const browser = await chromium.launch({ executablePath: CHROME });
for (const shot of shots) {
  if (only && !shot.file.includes(only)) continue;
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
  const png = join(TMP, `${shot.file}.png`);
  await page.screenshot({ path: png, clip: shot.clip });
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", png, "--out", join(OUT, `${shot.file}.jpg`)]);
  console.log("saved", `public/work/${shot.file}.jpg`);
  if (shot.dark) {
    await page.addStyleTag({ content: DARK_CSS });
    await page.waitForTimeout(300);
    const darkPng = join(TMP, `${shot.dark}.png`);
    await page.screenshot({ path: darkPng, clip: shot.clip });
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", darkPng, "--out", join(OUT, `${shot.dark}.jpg`)]);
    console.log("saved", `public/work/${shot.dark}.jpg`);
  }
  await page.close();
}
await browser.close();
console.log("Update width/height in lib/content.ts if the image sizes changed.");
