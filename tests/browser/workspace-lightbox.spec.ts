import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { prisma } from "../../src/server/db/prisma";
import { hashAdminPassword } from "../../src/server/auth/admin-password";
import { addStage, publish, type Actor } from "../../src/server/client/service";
import { saveUpload, storagePath } from "../../src/server/storage/files";

const password = `Preview-${randomUUID()}!`;
const username = `preview-${randomUUID()}`;
const image = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082", "hex");
const stream = (bytes: Buffer) => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
let adminId = "";
let clientId = "";
let otherClientId = "";
let projectId = "";
let otherProjectId = "";
let imageId = "";
let otherImageId = "";

test.beforeAll(async () => {
  const passwordHash = hashAdminPassword(password);
  const admin = await prisma.adminUser.create({ data: { username, passwordHash } }); adminId = admin.id;
  const client = await prisma.clientUser.create({ data: { name: "Проверка изображений", username: `${username}-client`, passwordHash } }); clientId = client.id;
  const otherClient = await prisma.clientUser.create({ data: { name: "Другой клиент", username: `${username}-other`, passwordHash } }); otherClientId = otherClient.id;
  const project = await prisma.clientProject.create({ data: { title: "Проверка просмотра", clientId } }); projectId = project.id;
  const otherProject = await prisma.clientProject.create({ data: { title: "Другой проект", clientId: otherClientId } }); otherProjectId = otherProject.id;
  const actor: Actor = { id: adminId, side: "ADMIN" };
  const stage = await addStage(projectId, actor, "Макет");
  const file = await saveUpload(projectId, actor, "макет.png", stream(image)); imageId = file.id;
  const otherFile = await saveUpload(otherProjectId, actor, "чужой.png", stream(image)); otherImageId = otherFile.id;
  await publish(projectId, actor, { stageId: stage.id, comment: "Проверьте изображение", materials: [{ title: "Макет на согласовании", fileId: imageId }, { title: "Техническое описание", kind: "DOCUMENT", url: "https://example.com/brief.pdf" }] });
  await prisma.projectMaterial.create({ data: { projectId, kind: "IMAGE", title: "Общий материал", url: `/api/files/${imageId}`, fileId: imageId, authorId: adminId, authorSide: "ADMIN" } });
});

test.afterAll(async () => {
  if (projectId) await prisma.$transaction(async tx => {
    const ids = { in: [projectId, otherProjectId] };
    await tx.notificationAttempt.deleteMany({ where: { notification: { projectId: ids } } });
    await tx.notification.deleteMany({ where: { projectId: ids } });
    await tx.versionMaterial.deleteMany({ where: { version: { stage: { projectId: ids } } } });
    await tx.projectMaterial.deleteMany({ where: { projectId: ids } });
    await tx.stageVersion.deleteMany({ where: { stage: { projectId: ids } } });
    await tx.projectStage.deleteMany({ where: { projectId: ids } });
    await tx.projectEvent.deleteMany({ where: { projectId: ids } });
    await tx.storedFile.deleteMany({ where: { projectId: ids } });
    await tx.clientProject.deleteMany({ where: { id: ids } });
    await tx.clientUser.deleteMany({ where: { id: { in: [clientId, otherClientId] } } });
    await tx.adminUser.delete({ where: { id: adminId } });
  });
  await Promise.all([imageId, otherImageId].filter(Boolean).map(id => unlink(storagePath(id)).catch(() => undefined)));
  await prisma.$disconnect();
});

test("Client and Admin preview only authorized images in the same dialog", async ({ browser, page }) => {
  test.setTimeout(90000);
  await page.goto("/client/login");
  await page.getByRole("textbox", { name: "Логин" }).fill(`${username}-client`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Войти в кабинет/ }).click();
  await expect(page).toHaveURL(/\/client(?:\?.*)?$/);
  let previewRequests = 0;
  page.on("request", request => { if (request.url().endsWith(`/api/files/${imageId}`)) previewRequests += 1; });
  await page.goto(`/client/projects/${projectId}?tab=approvals`);
  expect(previewRequests).toBe(0);
  const changes = page.getByRole("textbox", { name: "Консолидированный список правок" });
  await changes.fill("Сохранённый черновик правок");
  const trigger = page.getByRole("button", { name: /Увеличить изображение: Макет на согласовании/ });
  for (const width of [1440, 1024, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 820 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("img")).toHaveJSProperty("naturalWidth", 1);
      expect(await dialog.locator("img").getAttribute("src")).toBe(`/api/files/${imageId}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(changes).toHaveValue("Сохранённый черновик правок");
    }
  }
  expect(previewRequests).toBeGreaterThan(0);
  expect((await page.request.get(`/api/files/${otherImageId}`)).status()).toBe(404);
  expect(await page.getByRole("button", { name: /Техническое описание/ }).count()).toBe(0);
  await page.goto(`/client/projects/${projectId}?tab=materials`);
  await page.getByRole("button", { name: /Увеличить изображение: Общий материал/ }).click();
  await expect(page.getByRole("dialog").locator("img")).toHaveJSProperty("naturalWidth", 1);
  await page.getByRole("button", { name: "Закрыть изображение" }).click();

  const admin = await browser.newPage();
  try {
    await admin.goto("/admin/login");
    await admin.getByRole("textbox", { name: "Логин" }).fill(username);
    await admin.getByLabel("Пароль", { exact: true }).fill(password);
    await admin.getByRole("button", { name: /Войти в рабочее пространство/ }).click();
    await expect(admin).toHaveURL(/\/admin(?:\?.*)?$/);
    await admin.goto(`/admin/projects/${projectId}?tab=approvals`);
    for (const width of [1440, 1024, 430, 390, 360]) {
      await admin.setViewportSize({ width, height: 820 });
      for (const theme of ["dark", "light"]) {
        await admin.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        await admin.getByRole("button", { name: /Увеличить изображение: Макет на согласовании/ }).click();
        await expect(admin.getByRole("dialog").locator("img")).toHaveJSProperty("naturalWidth", 1);
        expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await admin.keyboard.press("Escape");
      }
    }
    expect((await admin.request.get(`/api/files/${imageId}`)).status()).toBe(200);
    await admin.goto(`/admin/projects/${projectId}?tab=materials`);
    await admin.getByRole("button", { name: /Увеличить изображение: Общий материал/ }).click();
    await expect(admin.getByRole("dialog").locator("img")).toHaveJSProperty("naturalWidth", 1);
  } finally { await admin.close(); }
});
