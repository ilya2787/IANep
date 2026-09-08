import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/server/db/prisma";
import { startBriefProject } from "./brief-project";
import { verifyAdminPassword } from "@/server/auth/admin-password";

test("заявка → клиент → проект: атомарность, повторная отправка и существующий клиент", async () => {
  const adminId = randomUUID(); const username = `test-${randomUUID()}`;
  const briefIds: string[] = []; const clientIds: string[] = [];
  async function brief() { const record = await prisma.briefRequest.create({ data: { name: "Тест связи", contact: "Test@Example.com", projectType: "WEBSITE", answers: { contactMethod: "Email" } } }); briefIds.push(record.id); return record; }
  try {
    const first = await brief();
    const input = { title: "Проект из заявки", username, password: "Test-project-only-2026!" };
    const [one, two] = await Promise.all([startBriefProject(first.id, adminId, input), startBriefProject(first.id, adminId, input)]);
    assert.equal(one.projectId, two.projectId);
    assert.equal(Number(one.created) + Number(two.created), 1);
    const project = await prisma.clientProject.findUniqueOrThrow({ where: { id: one.projectId }, include: { client: true, brief: true } });
    clientIds.push(project.clientId);
    assert.equal(project.briefId, first.id); assert.equal(project.brief?.status, "IN_PROGRESS");
    assert.ok(verifyAdminPassword(input.password, project.client.passwordHash));
    assert.equal(project.client.email, "test@example.com");
    assert.equal(project.client.emailNotificationsEnabled, false);
    assert.equal(await prisma.auditEvent.count({ where: { entityId: first.id, eventType: "BRIEF_PROJECT_CREATED" } }), 1);
    const second = await brief();
    const linked = await startBriefProject(second.id, adminId, { title: "Второй проект", clientId: project.clientId });
    assert.equal((await prisma.clientProject.findUniqueOrThrow({ where: { id: linked.projectId } })).clientId, project.clientId);
    const duplicate = await brief();
    await assert.rejects(startBriefProject(duplicate.id, adminId, input));
    assert.equal((await prisma.briefRequest.findUniqueOrThrow({ where: { id: duplicate.id } })).status, "NEW");
    assert.equal(await prisma.clientProject.count({ where: { briefId: duplicate.id } }), 0);
    const invalid = await brief();
    await assert.rejects(startBriefProject(invalid.id, adminId, { title: "Ошибка", clientId: randomUUID() }));
    assert.equal((await prisma.briefRequest.findUniqueOrThrow({ where: { id: invalid.id } })).status, "NEW");
    await prisma.briefRequest.update({ where: { id: first.id }, data: { status: "ARCHIVED" } });
    assert.equal((await startBriefProject(first.id, adminId, {})).projectId, one.projectId);
  } finally {
    await prisma.$transaction(async tx => {
      await tx.projectEvent.deleteMany({ where: { project: { briefId: { in: briefIds } } } });
      await tx.clientProject.deleteMany({ where: { briefId: { in: briefIds } } });
      await tx.auditEvent.deleteMany({ where: { entityType: "BriefRequest", entityId: { in: briefIds } } });
      await tx.briefRequest.deleteMany({ where: { id: { in: briefIds } } });
      await tx.clientUser.deleteMany({ where: { id: { in: clientIds } } });
    }); await prisma.$disconnect();
  }
});
