import { expect, test } from '@playwright/test';

test('Компактные настройки cookie доступны с клавиатуры во всех темах и размерах', async ({ page }) => {
  const requests: string[] = [];
  await page.route(/https:\/\/(?:[^/]+\.)?yandex\.(?:ru|com)\//, async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  for (const width of [320, 375, 430, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => {
        localStorage.setItem('ianep-analytics-choice-v1', 'necessary');
        localStorage.setItem('ianep-theme', value);
      }, theme);
      await page.goto('/legal/cookies');
      const button = page.getByRole('button', { name: 'Настройки cookie' });
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('title', 'Настройки cookie');
      const bounds = await button.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const coveredLinks = await page.evaluate(() => {
        const control = document.querySelector('button[title="Настройки cookie"]')!.getBoundingClientRect();
        return [...document.querySelectorAll('footer a')].filter((link) => {
          const rect = link.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.left < control.right && rect.right > control.left && rect.top < control.bottom && rect.bottom > control.top;
        }).map((link) => link.textContent);
      });
      expect(coveredLinks, `${width}px ${theme}`).toEqual([]);
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Аналитика и файлы cookie' })).toBeVisible();
      await expect(button).toHaveCount(0);
      expect(requests).toEqual([]);
    }
  }
});

test('Метрика: согласие, отказ и отзыв без внешней отправки', async ({ page }) => {
  const metrikaId = Number(process.env.NEXT_PUBLIC_METRIKA_TEST_ID) || 113770883;
  const requests: string[] = [];
  await page.route(/https:\/\/(?:[^/]+\.)?yandex\.(?:ru|com)\//, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await page.goto('/legal/cookies?contact=private@example.com');
  await expect(page.getByRole('heading', { name: 'Аналитика и файлы cookie' })).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Только необходимые' }).click();
  await page.reload();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Настройки cookie' }).click();
  await page.getByRole('button', { name: 'Разрешить аналитику' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ianep-analytics-choice-v1'))).toBe('allowed');
  await expect.poll(() => requests.length).toBe(1);
  expect(page.url()).toBe('http://localhost:3000/legal/cookies');
  expect(requests[0]).toBe(`https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`);
  await page.goto('/legal/cookies');
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toBe(`https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`);
  const calls = await page.evaluate(() => (window as Window & { ym?: { a?: unknown[][] } }).ym?.a ?? []);
  expect(calls.map((call) => call[1])).toEqual(['init', 'hit']);
  expect(calls[0][2]).toMatchObject({ defer: true, clickmap: false, webvisor: false, ecommerce: false, trackHash: false, trackLinks: false });
  expect(calls[1][2]).toBe('http://localhost:3000/legal/cookies');
  await page.getByRole('button', { name: 'Настройки cookie' }).click();
  await page.getByRole('button', { name: 'Только необходимые' }).click();
  await page.getByRole('button', { name: 'Настройки cookie' }).click();
  await page.getByRole('button', { name: 'Разрешить аналитику' }).click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toBe(`https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`);
  await page.goto('/admin/login');
  expect(requests).toHaveLength(3);
});
