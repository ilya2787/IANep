import { expect, test } from '@playwright/test';

test('тестовый счётчик не передаёт query при SPA навигации и истории', async ({ page }) => {
  const marker = 'private-marker-spa-20261024';
  const yandexRequests: string[] = [];
  page.on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?yandex\.(?:ru|com)\//.test(request.url())) yandexRequests.push(request.url());
  });
  await page.addInitScript(() => localStorage.setItem('ianep-analytics-choice-v2', 'allowed'));
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

test('тестовый счётчик получает только разрешённые рекламные метки после согласия', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?yandex\.(?:ru|com)\//.test(request.url())) requests.push(request.url());
  });
  await page.goto('/legal/cookies?yclid=AbCd12345678&utm_source=yandex&utm_medium=cpc&utm_campaign=ianep_search_ru&utm_content=12345&utm_term=private@example.com&contact=private@example.com#private@example.com');
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Разрешить аналитику' }).click();
  await expect.poll(() => page.url()).not.toContain('private@example.com');
  await expect.poll(() => requests.some((url) => url.includes('/watch/113771221')), { timeout: 20_000 }).toBe(true);
  expect(requests.some((url) => url.includes('private%40example.com') || url.includes('private@example.com'))).toBe(false);
  expect(requests.some((url) => url.includes('AbCd12345678'))).toBe(true);
  expect(requests.every((url) => !url.includes('/watch/') || url.includes('113771221'))).toBe(true);
});
