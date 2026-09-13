import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { access, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { prisma } from "@/server/db/prisma";
import { saveUpload, storagePath } from "@/server/storage/files";
import { archivedBriefCandidates, cleanupCandidates, storageSummary } from "@/server/storage/lifecycle";
import type { Actor } from "@/server/client/service";

const expiredAt = new Date("2020-01-01T00:00:00.000Z");
const deleteAfter = new Date("2020-02-01T00:00:00.000Z");
const stream = () => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(Buffer.from("cleanup candidate")); controller.close(); } });
const testStorageRoot = mkdtempSync(path.join(tmpdir(), "ianep-lifecycle-"));
process.env.IANEP_STORAGE_DIR = testStorageRoot;
after(async () => { await rm(testStorageRoot, { recursive: true, force: true }); });

test("preview проектов показывает только реально существующие физические файлы и ничего не удаляет", async () => {
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
    assert.equal(ids.has(missingFile.id), false);
    assert.equal(ids.has(empty.id), false);
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
