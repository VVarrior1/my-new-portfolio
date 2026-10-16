// Re-captures the product screenshots in public/work at retina resolution.
// public/work/cyd-venue-picker.jpg is not captured here: it comes from the CYD case study repo
// (screenshots/venue-picker.png, top 1110 px), because reaching that step means filling in the
// registration form, and that would send real lead emails and texts.
//   node scripts/capture-work-shots.mjs
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
    // The lesson area without the sidebar, in CSS pixels.
    clip: { x: 226, y: 105, width: 1200, height: 780 },
  },
];

const browser = await chromium.launch({ executablePath: CHROME });
for (const shot of shots) {
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
  await page.close();
}
await browser.close();
console.log("Update width/height in lib/content.ts if the image sizes changed.");
