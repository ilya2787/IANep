import { expect, test } from "@playwright/test";

for (const colorScheme of ["dark", "light"] as const) {
  test(`local ${colorScheme} homepage keeps images and hero eyes visible`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(theme => localStorage.setItem("ianep-theme", theme), colorScheme);
    const response = await page.goto("/", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-security-policy"]).not.toContain("upgrade-insecure-requests");

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < pageHeight; y += 600) {
      await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(100);
    }
    await page.waitForLoadState("networkidle");

    const images = await page.locator("img").evaluateAll(nodes => nodes.map(node => {
      const image = node as HTMLImageElement;
      return { url: image.currentSrc, complete: image.complete, width: image.naturalWidth };
    }));
    expect(images.filter(image => image.complete && image.width === 0)).toEqual([]);
    expect(images.some(image => image.url.includes("/images/responsive/hero/mascot-"))).toBe(true);

    const eyes = page.locator("[data-hero-eyes] span");
    await expect(eyes).toHaveCount(2);
    await expect(page.locator("[data-hero-eyes]")).toBeVisible();
    expect(await page.locator("[data-hero-eyes]").evaluate(node => getComputedStyle(node.parentElement!).opacity)).toBe("1");
    expect(errors).toEqual([]);
  });
}
