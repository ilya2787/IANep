import { devices, expect, test, type Page } from "@playwright/test";

const profiles = [
  { name: "iPhone 390 DPR3", viewport: { width: 390, height: 844 } },
  { name: "iPhone 430 DPR3", viewport: { width: 430, height: 932 } },
];

function mobileContextOptions(browserName: string) {
  if (browserName !== "webkit") return {};
  const { defaultBrowserType, ...iphone } = devices["iPhone 15 Pro"];
  void defaultBrowserType;
  return iphone;
}

async function allowLocalHttp(page: Page, browserName: string) {
  if (browserName !== "webkit") return;
  await page.route("http://localhost:3000/**", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    delete headers["strict-transport-security"];
    await route.fulfill({ response, headers });
  });
}

async function expectVisibleProjectLayers(page: Page) {
  const images = page.locator("#projects article[data-project] img");
  await page.locator("#projects").scrollIntoViewIfNeeded();
  await expect(images).toHaveCount(8);
  await expect.poll(async () => images.evaluateAll((nodes) => nodes.flatMap((node) => {
    const image = node as HTMLImageElement;
    const valid = image.complete
      && image.naturalWidth > 0
      && !image.currentSrc.includes("/_next/image")
      && Number.parseFloat(getComputedStyle(image).opacity) > 0.99
      && image.getBoundingClientRect().width > 0
      && image.getBoundingClientRect().height > 0;
    return valid ? [] : [{ src: image.currentSrc, complete: image.complete, naturalWidth: image.naturalWidth, opacity: getComputedStyle(image).opacity }];
  })), { timeout: 15_000 }).toEqual([]);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const profile of profiles) {
  for (const colorScheme of ["dark", "light"] as const) {
    test(`${profile.name} ${colorScheme}: project screens survive cold and warm loads`, async ({ browser, browserName }) => {
      const context = await browser.newContext({ ...mobileContextOptions(browserName), viewport: profile.viewport, deviceScaleFactor: 3, colorScheme });
      const page = await context.newPage();
      await allowLocalHttp(page, browserName);

      await page.goto("/", { waitUntil: "networkidle" });
      await expectVisibleProjectLayers(page);
      await page.reload({ waitUntil: "networkidle" });
      await expectVisibleProjectLayers(page);

      await context.close();
    });
  }
}

test("desktop layout keeps all project layers visible", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await allowLocalHttp(page, browserName);
  await page.goto("/", { waitUntil: "networkidle" });
  await expectVisibleProjectLayers(page);
  await context.close();
});

for (const route of ["/projects/onyx-cleaning", "/projects/pass-system"] as const) {
  for (const profile of profiles) {
    for (const colorScheme of ["dark", "light"] as const) {
      test(`${route} ${profile.name} ${colorScheme}: detail screenshots load while scrolling`, async ({ browser, browserName }) => {
        const context = await browser.newContext({ ...mobileContextOptions(browserName), viewport: profile.viewport, deviceScaleFactor: 3, colorScheme });
        const page = await context.newPage();
        await allowLocalHttp(page, browserName);
        await page.goto(route, { waitUntil: "networkidle" });

        const images = page.locator('main img[alt]:not([alt=""])');
        for (let index = 0; index < await images.count(); index += 1) {
          const image = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await expect.poll(async () => image.evaluate((node) => {
            const screenshot = node as HTMLImageElement;
            return screenshot.complete && screenshot.naturalWidth > 0;
          }), { timeout: 15_000 }).toBe(true);
        }

        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

        await context.close();
      });
    }
  }
}

test("site-wide image and theme sanity", async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: "dark" });
  const page = await context.newPage();
  await allowLocalHttp(page, browserName);

  for (const route of ["/", "/brief", "/legal/privacy", "/legal/cookies", "/definitely-not-found"] as const) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.75) {
        window.scrollTo(0, y);
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
    });
    const images = page.locator("img");
    await expect.poll(async () => images.evaluateAll((nodes) => nodes.every((node) => {
      const image = node as HTMLImageElement;
      const rect = image.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || getComputedStyle(image).display === "none") return true;
      return image.complete && image.naturalWidth > 0;
    })), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }

  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.locator("[data-theme-toggle]");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});
