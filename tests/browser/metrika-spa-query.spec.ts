import { expect, test } from '@playwright/test';

test('тестовый счётчик не передаёт query при SPA навигации и истории', async ({ page }) => {
  const marker = 'private-marker-spa-20261024';
  const yandexRequests: string[] = [];
  page.on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?yandex\.(?:ru|com)\//.test(request.url())) yandexRequests.push(request.url());
  });
  await page.addInitScript(() => localStorage.setItem('ianep-analytics-choice-v1', 'allowed'));
  await page.goto('/legal/cookies');
  await expect.poll(() => yandexRequests.some((url) => url.includes('113771221')), { timeout: 15_000 }).toBe(true);
  await page.evaluate((value) => history.pushState({}, '', `/legal/cookies?contact=${value}`), marker);
  await page.waitForTimeout(1800);
  await page.goBack();
  await page.waitForTimeout(1000);
  await page.goForward();
  await page.waitForTimeout(1800);
  expect(yandexRequests.some((url) => url.includes(marker))).toBe(false);
  expect(yandexRequests.filter((url) => url.includes('/watch')).every((url) => url.includes('113771221'))).toBe(true);
});
