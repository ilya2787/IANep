import { expect, test } from "@playwright/test";

for (const route of ["/projects/onyx-cleaning", "/projects/pass-system"] as const) {
  test(`${route}: screenshots open in place and all close paths restore focus and scroll`, async ({ page }) => {
    await page.goto("/");
    await page.goto(route, { waitUntil: "networkidle" });
    const triggers = page.getByRole("button", { name: /^Увеличить изображение:/ });
    const count = await triggers.count();
    expect(count).toBe(9);
    for (let index = 0; index < count; index += 1) {
      const trigger = triggers.nth(index);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      expect(page.url()).toContain(route);
      const close = dialog.getByRole("button", { name: "Закрыть изображение" });
      await expect(close).toBeFocused();
      await page.keyboard.press(index % 3 === 0 ? "Escape" : index % 3 === 1 ? "Tab" : "Escape");
      if (index % 3 === 1) {
        await expect(close).toBeFocused();
        await close.click();
      }
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");
    }
    await triggers.first().click();
    await page.locator('div[class*="backdrop"]').click({ position: { x: 3, y: 3 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(page.url()).toContain(route);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("project text uses Russian labels", async ({ page }) => {
  for (const route of ["/projects/onyx-cleaning", "/projects/pass-system"]) {
    await page.goto(route);
    const copy = await page.locator("main").innerText();
    expect(copy).not.toMatch(/\b(?:operator|admin|Audit|restore|Undo|redo|front|back|cookie auth|web-приложение)\b/i);
  }
});

test("image loading failure ends with an error and closes cleanly", async ({ page }) => {
  await page.route("**/images/projects/onyx-case/hero-desktop.webp", route => route.abort());
  await page.goto("/projects/onyx-cleaning");
  const trigger = page.getByRole("button", { name: /^Увеличить изображение:/ }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Не удалось загрузить изображение");
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("private file route rejects an unauthenticated preview", async ({ request }) => {
  const response = await request.get("/api/files/00000000-0000-4000-8000-000000000000");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});

for (const width of [1440, 1280, 1024, 430, 390, 360, 320]) {
  for (const route of ["/projects/onyx-cleaning", "/projects/pass-system"] as const) {
    test(`${route}: ${width}px has no overflow and image opens in both themes`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 500 ? 820 : 900 });
      await page.goto(route, { waitUntil: "networkidle" });
      for (const theme of ["dark", "light"] as const) {
        if (theme === "light") await page.locator("[data-theme-toggle]").click();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const trigger = page.getByRole("button", { name: /^Увеличить изображение:/ }).first();
        await trigger.click();
        const image = page.getByRole("dialog").locator("img");
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
        expect(await image.getAttribute("src")).toMatch(/^\/images\/projects\/.+\.webp$/);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    });
  }
}
