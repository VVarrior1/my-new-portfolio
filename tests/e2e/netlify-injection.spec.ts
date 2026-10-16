import { test, expect } from "@playwright/test";

// On the production domain Netlify injects this comment right after <meta charset>.
// Without the cleanup in app/layout.tsx, React fails to hydrate <head> (error #418)
// and re-renders the whole page on the client.
const NETLIFY_COMMENT = `\n<!-- This site is hosted on Netlify. Anyone can build and deploy a site\n     like this one for free: https://netlify.new/ -->`;

for (const path of ["/", "/blogs"]) {
  test(`hydrates cleanly when Netlify injects its head comment on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));

    await page.route(`**${path}`, async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const html = (await response.text()).replace(/(<meta charSet="utf-8"\/>)/i, `$1${NETLIFY_COMMENT}`);
      await route.fulfill({ response, body: html });
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(errors.filter((e) => /hydrat|#418|#423/i.test(e))).toEqual([]);
  });
}
