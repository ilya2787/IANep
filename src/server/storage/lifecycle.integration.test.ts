import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { access, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { prisma } from "@/server/db/prisma";
import { saveUpload, storagePath } from "@/server/storage/files";
import { archivedBriefCandidates, cleanupCandidates, purgeArchivedProjects, storageSummary } from "@/server/storage/lifecycle";
import { archiveProject, restoreProject, retentionDays } from "@/server/client/archive";
import type { Actor } from "@/server/client/service";

const expiredAt = new Date("2020-01-01T00:00:00.000Z");
const deleteAfter = new Date("2020-02-01T00:00:00.000Z");
const stream = () => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(Buffer.from("cleanup candidate")); controller.close(); } });
const testStorageRoot = mkdtempSync(path.join(tmpdir(), "ianep-lifecycle-"));
process.env.IANEP_STORAGE_DIR = testStorageRoot;
after(async () => { await rm(testStorageRoot, { recursive: true, force: true }); });

test("preview проектов включает кандидатов без физических файлов и ничего не удаляет", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Lifecycle preview", username: randomUUID(), passwordHash: "unused" } });
  const withFile = await prisma.clientProject.create({ data: { title: "С физическим файлом", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  const missingFile = await prisma.clientProject.create({ data: { title: "Только metadata", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  const empty = await prisma.clientProject.create({ data: { title: "Без файлов", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  const physical = await saveUpload(withFile.id, admin, "candidate.txt", stream());
  const missingId = randomUUID();
  await prisma.storedFile.create({ data: { id: missingId, projectId: missingFile.id, originalName: "missing.txt", mimeType: "application/octet-stream", size: 123, sha256: "0".repeat(64), kind: "FILE", authorId: admin.id, authorSide: "ADMIN" } });
  try {
    const candidates = await cleanupCandidates(new Date("2026-01-01T00:00:00.000Z"));
    const ids = new Set(candidates.map(candidate => candidate.id));
    assert.equal(ids.has(withFile.id), true);
    assert.equal(ids.has(missingFile.id), true);
    assert.equal(ids.has(empty.id), true);
    assert.deepEqual(candidates.find(candidate => candidate.id === withFile.id), { id: withFile.id, title: withFile.title, archivedAt: expiredAt, deleteAfter, files: 1, bytes: Buffer.byteLength("cleanup candidate") });
    assert.equal((await prisma.storedFile.findUniqueOrThrow({ where: { id: physical.id } })).physicalDeletedAt, null);
    await assert.doesNotReject(access(storagePath(physical.id)));
  } finally {
    await prisma.storedFile.deleteMany({ where: { projectId: { in: [withFile.id, missingFile.id, empty.id] } } });
    await prisma.clientProject.deleteMany({ where: { id: { in: [withFile.id, missingFile.id, empty.id] } } });
    await prisma.clientUser.delete({ where: { id: client.id } });
    await unlink(storagePath(physical.id)).catch(() => undefined);
  }
});

test("preview кандидатов ограничивает обе категории десятью записями", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Lifecycle pagination", username: randomUUID(), passwordHash: "unused" } });
  const projectIds: string[] = [];
  const fileIds: string[] = [];
  const briefIds: string[] = [];
  try {
    for (let index = 0; index < 11; index++) {
      const project = await prisma.clientProject.create({ data: { title: `Cleanup page ${index}`, clientId: client.id, archivedAt: new Date(expiredAt.getTime() + index), deleteAfter } });
      projectIds.push(project.id);
      fileIds.push((await saveUpload(project.id, admin, `candidate-${index}.txt`, stream())).id);
      briefIds.push((await prisma.briefRequest.create({ data: { name: `Brief page ${index}`, contact: `brief-${randomUUID()}@example.com`, projectType: "WEBSITE", answers: {}, status: "ARCHIVED", archivedAt: new Date(expiredAt.getTime() + index), deleteAfter } })).id);
    }
    const first = await storageSummary(1, 1);
    assert.equal(first.candidates.items.length, 10);
    assert.equal(first.briefCandidates.items.length, 10);
    assert.ok(first.candidates.pages >= 2);
    assert.ok(first.briefCandidates.pages >= 2);
  } finally {
    await prisma.storedFile.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.clientProject.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.clientUser.delete({ where: { id: client.id } });
    await prisma.briefRequest.deleteMany({ where: { id: { in: briefIds } } });
    await Promise.all(fileIds.map(id => unlink(storagePath(id)).catch(() => undefined)));
  }
});

test("архивная несвязанная Brief остаётся кандидатом без файлов, а пустые выборки дают empty-state data", async () => {
  const brief = await prisma.briefRequest.create({ data: { name: "Brief без вложений", contact: `${randomUUID()}@example.com`, projectType: "WEBSITE", answers: {}, status: "ARCHIVED", archivedAt: expiredAt, deleteAfter } });
  try {
    const candidates = await archivedBriefCandidates(new Date("2026-01-01T00:00:00.000Z"));
    assert.equal(candidates.some(candidate => candidate.id === brief.id), true);
    assert.ok(await prisma.briefRequest.findUnique({ where: { id: brief.id } }));
    const future = await cleanupCandidates(new Date("1900-01-01T00:00:00.000Z"));
    assert.equal(future.length, 0);
  } finally {
    await prisma.briefRequest.delete({ where: { id: brief.id } });
  }
});

test("несвязанная Brief без индивидуального срока становится кандидатом через 365 дней", async () => {
  const brief = await prisma.briefRequest.create({ data: { name: "365 days", contact: `${randomUUID()}@example.com`, projectType: "WEBSITE", answers: {}, status: "ARCHIVED", archivedAt: new Date("2025-01-01T00:00:00Z"), deleteAfter: null } });
  try {
    assert.equal((await archivedBriefCandidates(new Date("2025-12-31T23:59:59Z"))).some(item => item.id === brief.id), false);
    assert.equal((await archivedBriefCandidates(new Date("2026-01-01T00:00:00Z"))).some(item => item.id === brief.id), true);
  } finally {
    await prisma.briefRequest.delete({ where: { id: brief.id } });
  }
});

test("три года рекомендуются для нового архива; восстановленный и неистёкший проект не удаляются", async () => {
  assert.ok(retentionDays.includes(1095));
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Retention", username: randomUUID(), passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "Retention", clientId: client.id } });
  try {
    await archiveProject(project.id, admin, 1095);
    const archived = await prisma.clientProject.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(Math.round((archived.deleteAfter!.getTime() - archived.archivedAt!.getTime()) / 86_400_000), 1095);
    assert.equal((await cleanupCandidates()).some(item => item.id === project.id), false);
    await assert.rejects(purgeArchivedProjects([project.id], admin.id));
    await restoreProject(project.id, admin);
    assert.equal((await prisma.clientProject.findUniqueOrThrow({ where: { id: project.id } })).deleteAfter, null);
    assert.equal((await cleanupCandidates(new Date("2040-01-01"))).some(item => item.id === project.id), false);
    await assert.rejects(purgeArchivedProjects([project.id], admin.id, new Date("2040-01-01")));
  } finally {
    await prisma.projectEvent.deleteMany({ where: { projectId: project.id } });
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientUser.deleteMany({ where: { id: client.id } });
  }
});

test("устаревший кандидат после переноса срока удалён быть не может", async () => {
  const client = await prisma.clientUser.create({ data: { name: "Stale", username: randomUUID(), passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "Stale", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  try {
    assert.equal((await cleanupCandidates()).some(item => item.id === project.id), true);
    await prisma.clientProject.update({ where: { id: project.id }, data: { deleteAfter: new Date("2099-01-01") } });
    await assert.rejects(purgeArchivedProjects([project.id], randomUUID()));
    assert.ok(await prisma.clientProject.findUnique({ where: { id: project.id } }));
  } finally {
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientUser.deleteMany({ where: { id: client.id } });
  }
});

test("неожиданный тип физического объекта останавливает purge без изменения БД", async () => {
  const client = await prisma.clientUser.create({ data: { name: "Unsafe file", username: randomUUID(), passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "Unsafe file", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  const fileId = randomUUID();
  await prisma.storedFile.create({ data: { id: fileId, projectId: project.id, originalName: "bad", mimeType: "text/plain", size: 1, sha256: "0".repeat(64), kind: "FILE", authorId: randomUUID(), authorSide: "ADMIN" } });
  await mkdir(storagePath(fileId));
  try {
    await assert.rejects(purgeArchivedProjects([project.id], randomUUID()));
    assert.ok(await prisma.clientProject.findUnique({ where: { id: project.id } }));
    assert.ok(await prisma.storedFile.findUnique({ where: { id: fileId } }));
  } finally {
    await rm(storagePath(fileId), { recursive: true, force: true });
    await prisma.storedFile.deleteMany({ where: { id: fileId } });
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientUser.deleteMany({ where: { id: client.id } });
  }
});

test("ошибка второго файла возвращает первый из карантина и сохраняет граф", async () => {
  const client = await prisma.clientUser.create({ data: { name: "Rollback", username: randomUUID(), passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "Rollback", clientId: client.id, archivedAt: expiredAt, deleteAfter } });
  const firstId = "00000000-0000-4000-8000-000000000001";
  const secondId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  for (const id of [firstId, secondId]) await prisma.storedFile.create({ data: { id, projectId: project.id, originalName: "test.txt", mimeType: "text/plain", size: 1, sha256: "0".repeat(64), kind: "FILE", authorId: randomUUID(), authorSide: "ADMIN" } });
  await writeFile(storagePath(firstId), "a");
  await mkdir(storagePath(secondId));
  try {
    await assert.rejects(purgeArchivedProjects([project.id], randomUUID()));
    await assert.doesNotReject(access(storagePath(firstId)));
    assert.equal(await prisma.storedFile.count({ where: { projectId: project.id } }), 2);
    assert.ok(await prisma.clientProject.findUnique({ where: { id: project.id } }));
  } finally {
    await unlink(storagePath(firstId)).catch(() => undefined);
    await rm(storagePath(secondId), { recursive: true, force: true });
    await prisma.storedFile.deleteMany({ where: { projectId: project.id } });
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientUser.deleteMany({ where: { id: client.id } });
  }
});

test("full purge удаляет граф проекта, но сохраняет клиента с другим проектом и privacy-квитанцию", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Graph", username: randomUUID(), passwordHash: "unused" } });
  const brief = await prisma.briefRequest.create({ data: { name: "Graph", contact: `${randomUUID()}@example.com`, projectType: "WEBSITE", answers: {} } });
  const project = await prisma.clientProject.create({ data: { title: "Graph", clientId: client.id, briefId: brief.id, archivedAt: expiredAt, deleteAfter } });
  const other = await prisma.clientProject.create({ data: { title: "Other", clientId: client.id } });
  const stage = await prisma.projectStage.create({ data: { projectId: project.id, title: "Stage", position: 0 } });
  const version = await prisma.stageVersion.create({ data: { stageId: stage.id, number: 1, comment: "PII", authorId: admin.id } });
  await prisma.stageDecision.create({ data: { versionId: version.id, clientId: client.id, kind: "CHANGES", changes: "PII" } });
  await prisma.versionMaterial.create({ data: { versionId: version.id, kind: "LINK", title: "PII", url: "https://example.com" } });
  await prisma.projectMaterial.create({ data: { projectId: project.id, kind: "LINK", title: "PII", url: "https://example.com", authorId: admin.id, authorSide: "ADMIN" } });
  await prisma.projectPayment.create({ data: { projectId: project.id, title: "PII", amount: 1 } });
  await prisma.projectEvent.create({ data: { projectId: project.id, type: "TEST", message: "PII", actorId: admin.id, actorSide: "ADMIN" } });
  await prisma.notification.create({ data: { projectId: project.id, recipientClientId: client.id, eventType: "TEST", title: "PII", message: "PII" } });
  const receipt = await prisma.personalDataRequest.create({ data: { status: "COMPLETED", receiptExpiresAt: new Date("2030-01-01") } });
  try {
    const result = await purgeArchivedProjects([project.id], admin.id);
    assert.equal(result.accounts, 0);
    assert.equal(await prisma.clientProject.findUnique({ where: { id: project.id } }), null);
    assert.ok(await prisma.clientProject.findUnique({ where: { id: other.id } }));
    assert.ok(await prisma.clientUser.findUnique({ where: { id: client.id } }));
    assert.equal(await prisma.projectStage.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.projectMaterial.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.projectPayment.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.projectEvent.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.notification.count({ where: { projectId: project.id } }), 0);
    assert.equal(await prisma.briefRequest.findUnique({ where: { id: brief.id } }), null);
    assert.ok(await prisma.personalDataRequest.findUnique({ where: { id: receipt.id } }));
    await assert.rejects(purgeArchivedProjects([project.id], admin.id));
  } finally {
    await prisma.personalDataRequest.deleteMany({ where: { id: receipt.id } });
    await prisma.notification.deleteMany({ where: { projectId: { in: [project.id, other.id] } } });
    await prisma.stageDecision.deleteMany({ where: { version: { stage: { projectId: project.id } } } });
    await prisma.versionMaterial.deleteMany({ where: { version: { stage: { projectId: project.id } } } });
    await prisma.projectMaterial.deleteMany({ where: { projectId: project.id } });
    await prisma.stageVersion.deleteMany({ where: { stage: { projectId: project.id } } });
    await prisma.projectStage.deleteMany({ where: { projectId: project.id } });
    await prisma.projectPayment.deleteMany({ where: { projectId: project.id } });
    await prisma.projectEvent.deleteMany({ where: { projectId: project.id } });
    await prisma.clientProject.deleteMany({ where: { id: project.id } });
    await prisma.clientProject.deleteMany({ where: { id: other.id } });
    await prisma.briefRequest.deleteMany({ where: { id: brief.id } });
    await prisma.clientUser.deleteMany({ where: { id: client.id } });
  }
});
