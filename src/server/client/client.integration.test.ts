import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/server/db/prisma";
import { addStage, decide, publish, readProject, withProject, type Actor } from "./service";
import { materialSchema, warrantyEnd } from "./model";
import { archiveProject, purgeExpiredProjects, restoreProject } from "./archive";
import { dispatchPendingNotifications, enqueueNotification, listNotifications, markNotificationRead } from "@/server/notifications/service";
import { deleteUnusedClient, setClientActive } from "./users";

test("клиентский проект: публикации, изоляция доступа, решения и история", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const user = await prisma.clientUser.create({ data: { name: "Проверка кабинета", username: `test-${randomUUID()}`, passwordHash: "unused" } });
  const client: Actor = { id: user.id, side: "CLIENT" };
  const outsider: Actor = { id: randomUUID(), side: "CLIENT" };
  const project = await prisma.clientProject.create({ data: { title: "Проверка проекта", clientId: user.id } });
  try {
    const stage = await addStage(project.id, admin, "Дизайн");
    const material = { kind: "LINK", title: "Прототип", url: "https://example.com/review-v1" };
    await assert.rejects(publish(project.id, client, { stageId: stage.id, comment: "Готово", materials: [material] }));
    const version = await publish(project.id, admin, { stageId: stage.id, comment: "Первый результат", materials: [material] });
    assert.equal(version.number, 1);
    const notifications = await listNotifications({ clientId: user.id });
    assert.equal(notifications[0].eventType, "RESULT_PUBLISHED");
    assert.equal(notifications[0].readAt, null);
    assert.equal((await markNotificationRead({ clientId: outsider.id }, notifications[0].id)).count, 0);
    assert.equal((await markNotificationRead({ clientId: user.id }, notifications[0].id)).count, 1);
    assert.equal(notifications[0].attempts.some(attempt => attempt.channel === "EMAIL"), false);
    await prisma.clientUser.update({ where: { id: user.id }, data: { email: "client@example.com", emailNotificationsEnabled: true } });
    await prisma.$transaction(tx => enqueueNotification(tx, { recipient: { clientId: user.id }, projectId: project.id, eventType: "EMAIL_TEST", title: "Проверка email", message: "Тест", email: true }));
    await dispatchPendingNotifications();
    const dispatched = await listNotifications({ clientId: user.id });
    assert.equal(dispatched[0].attempts.find(attempt => attempt.channel === "EMAIL")?.status, "PENDING");
    assert.equal(await readProject(project.id, outsider), null);
    await assert.rejects(decide(project.id, outsider, { versionId: version.id, kind: "ACCEPTED", changes: "" }));
    await assert.rejects(publish(project.id, admin, { stageId: stage.id, comment: "Замена", materials: [material] }));
    await assert.rejects(decide(project.id, client, { versionId: version.id, kind: "CHANGES", changes: " " }));
    const attempts = await Promise.allSettled([decide(project.id, client, { versionId: version.id, kind: "CHANGES", changes: "1. Увеличить заголовок.\n2. Уточнить текст." }), decide(project.id, client, { versionId: version.id, kind: "CHANGES", changes: "Повторная отправка" })]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter(result => result.status === "rejected").length, 1);
    const second = await publish(project.id, admin, { stageId: stage.id, comment: "Правки выполнены", materials: [{ ...material, url: "https://example.com/review-v2" }] });
    assert.equal(second.number, 2);
    await assert.rejects(decide(project.id, client, { versionId: version.id, kind: "ACCEPTED", changes: "" }));
    await decide(project.id, client, { versionId: second.id, kind: "CHANGES", changes: "Исправьте ошибку в согласованном тексте" });
    const third = await publish(project.id, admin, { stageId: stage.id, comment: "Ошибка исправлена", materials: [material] });
    await decide(project.id, client, { versionId: third.id, kind: "CHANGES", changes: "Дополнительный раунд не блокируется" });
    const fourth = await publish(project.id, admin, { stageId: stage.id, comment: "Финальный результат", materials: [material] });
    await decide(project.id, client, { versionId: fourth.id, kind: "ACCEPTED", changes: "" });
    const result = await readProject(project.id, client);
    assert.ok(result);
    assert.equal(result.stages[0].status, "COMPLETED");
    assert.equal(result.stages[0].versions.length, 4);
    assert.equal(result.stages[0].versions[3].comment, "Первый результат");
    assert.equal(result.stages[0].versions[3].materials[0].url, material.url);
    assert.equal(result.stages[0].versions.filter(item => item.decision?.countsTowardLimit).length, 3);
    assert.equal(result.events.filter(item => item.type === "RESULT_PUBLISHED").length, 4);
    const before = result.events.length;
    await assert.rejects(withProject(project.id, admin, async tx => { await tx.projectEvent.create({ data: { projectId: project.id, actorId: admin.id, actorSide: "ADMIN", type: "ROLLBACK", message: "Не должно сохраниться" } }); throw new Error("Откат"); }));
    assert.equal((await readProject(project.id, client))?.events.length, before);
  } finally {
    await prisma.$transaction(async tx => {
      await tx.stageDecision.deleteMany({ where: { version: { stage: { projectId: project.id } } } });
      await tx.versionMaterial.deleteMany({ where: { version: { stage: { projectId: project.id } } } });
      await tx.stageVersion.deleteMany({ where: { stage: { projectId: project.id } } });
      await tx.projectEvent.deleteMany({ where: { projectId: project.id } });
      await tx.projectStage.deleteMany({ where: { projectId: project.id } });
      await tx.clientProject.delete({ where: { id: project.id } });
      await tx.clientUser.delete({ where: { id: user.id } });
    });
    await prisma.$disconnect();
  }
});
test("материалы запрещают исполняемые ссылки, гарантия считается календарными днями", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,bad", "https://user:password@example.com"]) assert.equal(materialSchema.safeParse({ kind: "LINK", title: "Ссылка", url }).success, false);
  assert.equal(warrantyEnd(new Date("2026-12-15T00:00:00Z")).toISOString(), "2027-01-14T00:00:00.000Z");
});

test("архив проекта скрывается от клиента, восстанавливается и удаляется только после срока", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const user = await prisma.clientUser.create({ data: { name: "Проверка архива", username: `archive-${randomUUID()}`, passwordHash: "unused" } });
  const client: Actor = { id: user.id, side: "CLIENT" };
  const project = await prisma.clientProject.create({ data: { title: "Архивный проект", clientId: user.id } });
  try {
    await archiveProject(project.id, admin, 30);
    assert.equal(await readProject(project.id, client), null);
    const archived = await readProject(project.id, admin);
    assert.ok(archived?.archivedAt);
    assert.ok(archived?.deleteAfter);
    assert.equal(await purgeExpiredProjects(new Date()), 0);
    await restoreProject(project.id, admin);
    assert.ok(await readProject(project.id, client));
    await archiveProject(project.id, admin, 30);
    await prisma.clientProject.update({ where: { id: project.id }, data: { deleteAfter: new Date("2020-01-01T00:00:00Z") } });
    assert.equal(await purgeExpiredProjects(new Date()), 0);
    assert.ok(await readProject(project.id, admin));
  } finally {
    await prisma.projectEvent.deleteMany({ where: { projectId: project.id } });
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientUser.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
});

test("пользователь блокируется с отзывом сессий, а физическое удаление запрещено при истории", async () => {
  const unused = await prisma.clientUser.create({ data: { name: "Ошибочный аккаунт", username: `unused-${randomUUID()}`, passwordHash: "unused" } });
  await deleteUnusedClient(unused.id, randomUUID());
  assert.equal(await prisma.clientUser.findUnique({ where: { id: unused.id } }), null);
  const linked = await prisma.clientUser.create({ data: { name: "Клиент с историей", username: `linked-${randomUUID()}`, passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "История", clientId: linked.id } });
  try {
    await setClientActive(linked.id, false, randomUUID());
    const blocked = await prisma.clientUser.findUniqueOrThrow({ where: { id: linked.id } });
    assert.equal(blocked.active, false);
    assert.equal(blocked.sessionVersion, 1);
    await assert.rejects(deleteUnusedClient(linked.id, randomUUID()));
  } finally {
    await prisma.clientProject.delete({ where: { id: project.id } });
    await prisma.clientUser.delete({ where: { id: linked.id } });
  }
});
