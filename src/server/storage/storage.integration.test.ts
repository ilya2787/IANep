import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { prisma } from "@/server/db/prisma";
import { addStage, publish, decide, type Actor } from "@/server/client/service";
import { saveUpload, fileBytes, inspectFile, readableFile, storagePath, MAX_FILE_BYTES } from "./files";
import { cleanArchivedProjectFiles } from "./lifecycle";

test("хранилище: изоляция, публикация, неизменяемые версии и целостность", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Тест файлов", username: randomUUID(), passwordHash: "unused" } });
  const actor: Actor = { id: client.id, side: "CLIENT" };
  const stranger: Actor = { id: randomUUID(), side: "CLIENT" };
  const project = await prisma.clientProject.create({ data: { title: "Хранилище", clientId: client.id } });
  const other = await prisma.clientProject.create({ data: { title: "Другой проект", clientId: client.id } });
  const ids: string[] = [];
  const content = Buffer.from("Первый результат");
  const stream = (bytes: Buffer) => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  try {
    await assert.rejects(saveUpload(project.id, stranger, "file.txt", stream(content)));
    const file = await saveUpload(project.id, admin, "результат.txt", stream(content)); ids.push(file.id);
    assert.equal(await readableFile(file.id, actor), null);
    assert.ok(await readableFile(file.id, admin));
    const stage = await addStage(project.id, admin, "Результат");
    const otherStage = await addStage(other.id, admin, "Другой этап");
    await assert.rejects(publish(other.id, admin, { stageId: otherStage.id, comment: "Чужой файл", materials: [{ title: "Файл", fileId: file.id }] }));
    const version = await publish(project.id, admin, { stageId: stage.id, comment: "Первая версия", materials: [{ title: "Файл", fileId: file.id }] });
    assert.ok(await readableFile(file.id, actor));
    assert.equal(await readableFile(file.id, stranger), null);
    await decide(project.id, actor, { versionId: version.id, kind: "CHANGES", changes: "Обновить текст" });
    const second = await saveUpload(project.id, admin, "результат.txt", stream(Buffer.from("Второй результат"))); ids.push(second.id);
    await publish(project.id, admin, { stageId: stage.id, comment: "Вторая версия", materials: [{ title: "Файл", fileId: second.id }] });
    assert.notEqual(second.id, file.id);
    assert.deepEqual(await fileBytes(file), content);
    const clientFile = await saveUpload(project.id, actor, "материал.txt", stream(content)); ids.push(clientFile.id);
    assert.ok(await readableFile(clientFile.id, actor));
    await writeFile(storagePath(second.id), "Повреждение");
    await assert.rejects(fileBytes(second));
    await assert.rejects(saveUpload(project.id, actor, "large.txt", stream(Buffer.alloc(MAX_FILE_BYTES + 1))));
  } finally {
    await prisma.$transaction(async tx => {
      const projects = { in: [project.id, other.id] };
      await tx.stageDecision.deleteMany({ where: { version: { stage: { projectId: projects } } } });
      await tx.versionMaterial.deleteMany({ where: { version: { stage: { projectId: projects } } } });
      await tx.stageVersion.deleteMany({ where: { stage: { projectId: projects } } });
      await tx.projectStage.deleteMany({ where: { projectId: projects } });
      await tx.projectEvent.deleteMany({ where: { projectId: projects } });
      await tx.storedFile.deleteMany({ where: { projectId: projects } });
      await tx.clientProject.deleteMany({ where: { id: projects } });
      await tx.clientUser.delete({ where: { id: client.id } });
    });
    await Promise.all(ids.map(id => unlink(storagePath(id))));
    await prisma.$disconnect();
  }
});
test("формат и безопасный путь файла", () => {
  assert.throws(() => storagePath("../../etc/passwd"));
  assert.throws(() => inspectFile("script.svg", Buffer.from('<svg onload="alert(1)"/>')));
  assert.throws(() => inspectFile("fake.png", Buffer.from("not an image")));
  assert.throws(() => inspectFile("empty.txt", Buffer.alloc(0)));
  assert.equal(inspectFile("file.pdf", Buffer.from("%PDF-1.7\n")).kind, "DOCUMENT");
});

test("контролируемая очистка удаляет физический файл, но сохраняет метаданные", async () => {
  const admin: Actor = { id: randomUUID(), side: "ADMIN" };
  const client = await prisma.clientUser.create({ data: { name: "Тест retention", username: randomUUID(), passwordHash: "unused" } });
  const project = await prisma.clientProject.create({ data: { title: "Архив retention", clientId: client.id, archivedAt: new Date("2020-01-01"), deleteAfter: new Date("2020-02-01") } });
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(Buffer.from("Исторический файл")); controller.close(); } });
  const file = await saveUpload(project.id, admin, "history.txt", stream);
  try {
    const result = await cleanArchivedProjectFiles([project.id], admin.id);
    assert.equal(result.files, 1);
    const metadata = await prisma.storedFile.findUniqueOrThrow({ where: { id: file.id } });
    assert.ok(metadata.physicalDeletedAt);
    await assert.rejects(fileBytes(file));
  } finally {
    await prisma.storedFile.deleteMany({ where: { projectId: project.id } });
    await prisma.clientProject.delete({ where: { id: project.id } });
    await prisma.clientUser.delete({ where: { id: client.id } });
    await unlink(storagePath(file.id)).catch(() => undefined);
  }
});
