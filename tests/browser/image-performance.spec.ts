import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
  for (const colorScheme of ["dark", "light"] as const) {
    test(`${viewport.width}px ${colorScheme}: active theme assets load before or near viewport entry`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 3 : 1, colorScheme });
      const page = await context.newPage();
      await page.addInitScript(theme => localStorage.setItem("ianep-theme", theme), colorScheme);
      const imageRequests: string[] = [];
      page.on("request", request => {
        if (request.resourceType() === "image") imageRequests.push(request.url());
      });

      await page.goto("/", { waitUntil: "domcontentloaded" });
      for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += viewport.height * .55) {
        await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(550);
        const visibleLoading = await page.locator('[class*="placeholder"]:not([class*="Settled"])').evaluateAll(nodes => nodes.filter(node => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== "none" && Number.parseFloat(style.opacity) > .1
            && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        }).length);
        expect(visibleLoading).toBeLessThanOrEqual(1);
      }

      const inactiveTheme = colorScheme === "dark" ? "-light-" : "-dark-";
      expect(imageRequests.filter(url => url.includes("/images/responsive/") && url.includes(inactiveTheme))).toEqual([]);
      expect(imageRequests.filter(url => url.includes("/images/responsive/") && url.includes("/_next/image"))).toEqual([]);
      await context.close();
    });
  }
}
