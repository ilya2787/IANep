import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { prisma } from "@/server/db/prisma";
import { storagePath } from "@/server/storage/files";
import { addPrivacyReceiptRetention, cleanupExpiredPrivacyReceipts, executePrivacyRequest, preparePrivacyRequest, registerPrivacyRequest, validateExclusions } from "./requests";
import { createPrivacyLookupHash, findCompletedPrivacyRequests } from "./lookup";

test("запрос субъекта: изоляция, двойное подтверждение, каскад, файлы и обезличенный результат", async () => {
  const previousStorage = process.env.IANEP_STORAGE_DIR;
  const previousLookupSecret = process.env.PRIVACY_LOOKUP_SECRET;
  process.env.PRIVACY_LOOKUP_SECRET = "integration-privacy-lookup-secret-at-least-32-bytes";
  const testStorage = await mkdtemp(path.join(os.tmpdir(), "ianep-privacy-test-"));
  process.env.IANEP_STORAGE_DIR = testStorage;
  const suffix = randomUUID();
  const subject = await prisma.clientUser.create({ data: { name: "Субъект удаления", username: `privacy-${suffix}`, email: `subject-${suffix}@example.test`, passwordHash: "unused" } });
  const stranger = await prisma.clientUser.create({ data: { name: "Другой клиент", username: `other-${suffix}`, passwordHash: "unused" } });
  const brief = await prisma.briefRequest.create({ data: { name: "Персональная заявка", contact: `subject-${suffix}@example.test`, projectType: "WEB", answers: { details: "Содержание проекта" } } });
  const project = await prisma.clientProject.create({ data: { title: "Удаляемый проект", description: "Конфиденциальное описание", clientId: subject.id, briefId: brief.id } });
  const otherProject = await prisma.clientProject.create({ data: { title: "Чужой проект", clientId: stranger.id } });
  const fileId = randomUUID(); const otherFileId = randomUUID();
  await writeFile(storagePath(fileId), "personal file"); await writeFile(storagePath(otherFileId), "other file");
  await prisma.storedFile.createMany({ data: [
    { id: fileId, projectId: project.id, originalName: "personal.txt", mimeType: "text/plain", size: 13, sha256: "unused", kind: "FILE", authorId: subject.id, authorSide: "CLIENT" },
    { id: otherFileId, projectId: otherProject.id, originalName: "other.txt", mimeType: "text/plain", size: 10, sha256: "unused", kind: "FILE", authorId: stranger.id, authorSide: "CLIENT" },
  ] });
  await prisma.projectStage.create({ data: { projectId: project.id, title: "Этап", position: 1 } });
  await prisma.notification.create({ data: { recipientClientId: subject.id, projectId: project.id, eventType: "TEST", title: "Личное", message: "Персональное уведомление" } });
  await prisma.projectEvent.create({ data: { projectId: project.id, type: "TEST", message: "Персональная история", actorId: subject.id, actorSide: "CLIENT" } });
  await prisma.auditEvent.create({ data: { eventType: "TEST_PERSONAL", entityType: "CLIENT_USER", entityId: subject.id, metadata: { email: subject.email } } });
  let requestId = "";
  try {
    const request = await registerPrivacyRequest({ kind: "CONSENT_WITHDRAWAL", scope: "CLIENT", targetId: subject.id, receivedAt: new Date("2026-09-11T00:00:00Z"), channel: "EMAIL", lookupValue: subject.email });
    requestId = request.id;
    await preparePrivacyRequest(request.id, [], null);
    await assert.rejects(executePrivacyRequest(request.id, "УДАЛИТЬ НЕ ТО"));
    assert.ok(await prisma.clientUser.findUnique({ where: { id: subject.id } }), "первое/ошибочное подтверждение не удаляет данные");

    await executePrivacyRequest(request.id, `УДАЛИТЬ ${request.number}`);
    assert.equal(await prisma.clientUser.findUnique({ where: { id: subject.id } }), null);
    assert.equal(await prisma.clientProject.findUnique({ where: { id: project.id } }), null);
    assert.equal(await prisma.briefRequest.findUnique({ where: { id: brief.id } }), null);
    await assert.rejects(access(storagePath(fileId)));
    assert.ok(await prisma.clientUser.findUnique({ where: { id: stranger.id } }), "чужой аккаунт сохранён");
    assert.ok(await prisma.clientProject.findUnique({ where: { id: otherProject.id } }), "чужой проект сохранён");
    await access(storagePath(otherFileId));

    const receipt = await prisma.personalDataRequest.findUniqueOrThrow({ where: { id: request.id } });
    assert.equal(receipt.targetId, null);
    assert.equal(receipt.status, "COMPLETED");
    assert.equal(receipt.kind, null);
    assert.equal(receipt.lookupType, "EMAIL");
    assert.equal(receipt.lookupHash, createPrivacyLookupHash("EMAIL", subject.email!));
    assert.deepEqual(receipt.receiptExpiresAt, addPrivacyReceiptRetention(receipt.completedAt!));
    assert.equal(JSON.stringify(receipt).includes(subject.name), false);
    assert.equal(JSON.stringify(receipt).includes(subject.email!), false);
    assert.equal(await prisma.auditEvent.count({ where: { eventType: "TEST_PERSONAL" } }), 0);
    const legalAudit = await prisma.auditEvent.findMany({ where: { entityType: "PERSONAL_DATA_REQUEST", entityId: request.id } });
    assert.equal(JSON.stringify(legalAudit).includes(subject.name), false);
    assert.equal(JSON.stringify(legalAudit).includes(subject.email!), false);
    await assert.rejects(findCompletedPrivacyRequests("EMAIL", subject.email!, { side: "CLIENT" }));
    const matches = await findCompletedPrivacyRequests("EMAIL", subject.email!, { side: "ADMIN" });
    assert.equal(matches.some(item => item.number === request.number), true);
    assert.equal(JSON.stringify(matches).includes(subject.email!), false);

    const cleanupAt = new Date(receipt.receiptExpiresAt!.getTime());
    const cleanup = await cleanupExpiredPrivacyReceipts(cleanupAt);
    assert.equal(cleanup.receipts, 1);
    const purged = await prisma.personalDataRequest.findUniqueOrThrow({ where: { id: request.id } });
    assert.equal(purged.lookupType, "NONE");
    assert.equal(purged.lookupHash, null);
    assert.equal(purged.targetId, null);
    assert.equal(purged.scope, null);
    assert.equal(purged.channel, null);
    assert.equal(purged.receivedAt, null);
    assert.equal(purged.completedAt, null);
    assert.equal(purged.createdAt, null);
    assert.equal(purged.destroyedCategories, null);
    assert.equal(purged.result, null);
    assert.deepEqual(await cleanupExpiredPrivacyReceipts(cleanupAt), { receipts: 0 });
    assert.equal((await findCompletedPrivacyRequests("EMAIL", subject.email!, { side: "ADMIN" })).some(item => item.number === request.number), false);
    const cleanupAudit = await prisma.auditEvent.findMany({ where: { eventType: "PRIVACY_RECEIPTS_PURGED" }, orderBy: { createdAt: "desc" }, take: 1 });
    const serializedAudit = JSON.stringify(cleanupAudit);
    for (const forbidden of [subject.name, subject.email!, createPrivacyLookupHash("EMAIL", subject.email!), subject.id, project.id, brief.id, request.id]) assert.equal(serializedAudit.includes(forbidden), false);
    assert.deepEqual(Object.keys((cleanupAudit[0]?.metadata ?? {}) as object), ["count"]);
  } finally {
    if (requestId) await prisma.auditEvent.deleteMany({ where: { entityType: "PERSONAL_DATA_REQUEST", entityId: requestId } });
    if (requestId) await prisma.personalDataRequest.deleteMany({ where: { id: requestId } });
    await prisma.storedFile.deleteMany({ where: { projectId: otherProject.id } });
    await prisma.clientProject.deleteMany({ where: { id: otherProject.id } });
    await prisma.clientUser.deleteMany({ where: { id: stranger.id } });
    await prisma.auditEvent.deleteMany({ where: { eventType: "TEST_PERSONAL" } });
    await unlink(storagePath(fileId)).catch(() => undefined); await unlink(storagePath(otherFileId)).catch(() => undefined);
    if (previousStorage === undefined) delete process.env.IANEP_STORAGE_DIR; else process.env.IANEP_STORAGE_DIR = previousStorage;
    if (previousLookupSecret === undefined) delete process.env.PRIVACY_LOOKUP_SECRET; else process.env.PRIVACY_LOOKUP_SECRET = previousLookupSecret;
    await rm(testStorage, { recursive: true, force: true });
    await prisma.$disconnect();
  }
});

test("неидентифицирующие каналы регистрируются без контакта и секрета", async () => {
  const previousLookupSecret = process.env.PRIVACY_LOOKUP_SECRET;
  delete process.env.PRIVACY_LOOKUP_SECRET;
  const brief = await prisma.briefRequest.create({ data: { name: "Без контакта", contact: "legacy", projectType: "WEB", answers: {} } });
  const requestIds: string[] = [];
  try {
    for (const channel of ["FORM", "WRITTEN", "IN_PERSON", "OTHER"] as const) {
      const request = await registerPrivacyRequest({ kind: "OTHER", scope: "BRIEF", targetId: brief.id, receivedAt: new Date(), channel });
      requestIds.push(request.id);
      assert.equal(request.lookupType, "NONE");
      assert.equal(request.lookupHash, null);
      const audits = await prisma.auditEvent.findMany({ where: { entityType: "PERSONAL_DATA_REQUEST", entityId: request.id } });
      assert.equal(JSON.stringify(audits).includes("legacy"), false);
    }
  } finally {
    await prisma.auditEvent.deleteMany({ where: { entityType: "PERSONAL_DATA_REQUEST", entityId: { in: requestIds } } });
    await prisma.personalDataRequest.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.briefRequest.delete({ where: { id: brief.id } });
    if (previousLookupSecret === undefined) delete process.env.PRIVACY_LOOKUP_SECRET; else process.env.PRIVACY_LOOKUP_SECRET = previousLookupSecret;
    await prisma.$disconnect();
  }
});

test("срок privacy-квитанции равен трём календарным годам от исполнения", () => {
  assert.deepEqual(addPrivacyReceiptRetention(new Date("2024-02-29T12:34:56.789Z")), new Date("2027-02-28T12:34:56.789Z"));
  assert.deepEqual(addPrivacyReceiptRetention(new Date("2026-09-11T00:00:00.000Z")), new Date("2029-09-11T00:00:00.000Z"));
});

test("исключения не позволяют обойти FK-зависимости", () => {
  assert.throws(() => validateExclusions("CLIENT", ["PROJECTS"]));
  assert.throws(() => validateExclusions("PROJECT", ["FILES"]));
  assert.throws(() => validateExclusions("CLIENT", ["ACCOUNT", "NOTIFICATIONS"]));
  assert.doesNotThrow(() => validateExclusions("CLIENT", ["ACCOUNT", "PROJECTS", "FILES"]));
});
