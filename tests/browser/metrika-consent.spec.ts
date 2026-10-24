import { expect, test } from '@playwright/test';

test('Метрика: согласие, отказ и отзыв без внешней отправки', async ({ page }) => {
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
  expect(requests).toEqual([]);
  await page.goto('/legal/cookies');
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toBe('https://mc.yandex.ru/metrika/tag.js?id=113770883');
  const calls = await page.evaluate(() => (window as Window & { ym?: { a?: unknown[][] } }).ym?.a ?? []);
  expect(calls.map((call) => call[1])).toEqual(['init', 'hit']);
  expect(calls[0][2]).toMatchObject({ defer: true, clickmap: false, webvisor: false, ecommerce: false, trackHash: false, trackLinks: false });
  expect(calls[1][2]).toBe('http://localhost:3000/legal/cookies');
  await page.getByRole('button', { name: 'Настройки cookie' }).click();
  await page.getByRole('button', { name: 'Только необходимые' }).click();
  await page.getByRole('button', { name: 'Настройки cookie' }).click();
  await page.getByRole('button', { name: 'Разрешить аналитику' }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toBe('https://mc.yandex.ru/metrika/tag.js?id=113770883');
  await page.goto('/admin/login');
  expect(requests).toHaveLength(2);
});
