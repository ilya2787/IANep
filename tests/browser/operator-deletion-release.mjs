import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import pg from "pg";

const baseURL = "http://127.0.0.1:3000";
const ownerName = process.env.IANEP_TEST_OWNER;
const ownerPassword = process.env.IANEP_TEST_OWNER_PASSWORD;
const database = new URL(process.env.DATABASE_URL ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "55439");
assert.equal(database.pathname, "/ianep_release_test");
assert.ok(ownerName && ownerPassword, "Задайте IANEP_TEST_OWNER и IANEP_TEST_OWNER_PASSWORD");

const operatorName = `release-operator-${Date.now()}`;
const operatorPassword = `ReleaseOperator-${Date.now()}!`;
const output = "test-results/operator-deletion-release";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const owner = await browser.newContext();
const operator = await browser.newContext();
const ownerPage = await owner.newPage();
const operatorPage = await operator.newPage();

async function login(page, name, password) {
  await page.goto(`${baseURL}/admin/login`);
  await page.getByLabel("Логин").fill(name);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Войти в рабочее пространство/ }).click();
  await page.waitForURL(`${baseURL}/admin`);
}

try {
  await login(ownerPage, ownerName, ownerPassword);
  await ownerPage.goto(`${baseURL}/admin/staff`);
  await ownerPage.getByLabel("Логин").fill(operatorName);
  await ownerPage.getByLabel("Временный пароль").fill(operatorPassword);
  await ownerPage.getByRole("button", { name: "Создать оператора" }).click();
  const card = ownerPage.locator("article").filter({ has: ownerPage.getByRole("heading", { name: operatorName }) });
  await card.waitFor();
  await ownerPage.getByRole("button", { name: "Понятно" }).click();

  for (const [width, height] of [[1440, 900], [1920, 1080]]) {
    await ownerPage.setViewportSize({ width, height });
    for (const theme of ["light", "dark"]) {
      await ownerPage.evaluate(value => {
        localStorage.setItem("ianep-theme", value);
        document.documentElement.dataset.theme = value;
        window.dispatchEvent(new Event("ianep-theme-change"));
      }, theme);
      await card.locator("summary", { hasText: "Удалить оператора" }).click();
      assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Горизонтальная прокрутка при ${width}x${height}, ${theme}`);
      await ownerPage.screenshot({ path: `${output}/staff-${width}x${height}-${theme}.png`, fullPage: true });
      await card.locator("summary", { hasText: "Удалить оператора" }).click();
    }
  }

  await login(operatorPage, operatorName, operatorPassword);
  await operatorPage.goto(`${baseURL}/admin/projects`);
  assert.match(await operatorPage.getByRole("heading", { level: 1 }).first().innerText(), /Проекты/);
  const oldCookie = (await operator.cookies()).find(cookie => cookie.name === "ianep_admin_session");
  assert.ok(oldCookie, "Не получен сеанс оператора");

  await card.locator("summary", { hasText: "Удалить оператора" }).click();
  await card.getByLabel("Подтверждаю необратимое удаление оператора").check();
  await card.getByLabel("Введите «УДАЛИТЬ»").fill("УДАЛИТЬ");
  await card.getByRole("button", { name: "Удалить оператора" }).click();
  await card.waitFor({ state: "detached" });

  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const result = await db.query('SELECT count(*)::int AS count FROM admin_users WHERE username = $1', [operatorName]);
    assert.equal(result.rows[0].count, 0, "Учётная запись осталась в БД");
  } finally {
    await db.end();
  }

  await operatorPage.getByRole("button", { name: "Выйти" }).click();
  await operatorPage.waitForURL(/\/admin\/login/);

  await operatorPage.goto(`${baseURL}/admin/projects`);
  await operatorPage.waitForURL(/\/admin\/login/);
  const protectedResponse = await operator.request.get(`${baseURL}/admin/events`, { maxRedirects: 0 });
  assert.equal(protectedResponse.status(), 307);
  assert.match(protectedResponse.headers().location ?? "", /\/admin\/login/);
  await operatorPage.getByLabel("Логин").fill(operatorName);
  await operatorPage.getByLabel("Пароль", { exact: true }).fill(operatorPassword);
  await operatorPage.getByRole("button", { name: /Войти в рабочее пространство/ }).click();
  await operatorPage.waitForURL(/error=credentials/);
  console.log(`PASS: ${operatorName}; 4 снимка; старый сеанс и повторный вход отклонены`);
} finally {
  await browser.close();
}
