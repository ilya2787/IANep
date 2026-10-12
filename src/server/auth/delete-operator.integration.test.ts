import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { deleteOperatorRecord, OperatorDeletionError } from "./delete-operator";
import { adminRepository } from "./admin.repository";

test("удаление оператора закрывает сеансы, удаляет уведомления и сохраняет журнал", async () => {
  const owner = await prisma.adminUser.create({ data: { username: `owner-${randomUUID()}`, passwordHash: "test", role: "owner" } });
  const operator = await prisma.adminUser.create({ data: { username: `operator-${randomUUID()}`, passwordHash: "test", role: "operator" } });
  const notification = await prisma.notification.create({ data: { recipientAdminId: operator.id, eventType: "TEST", title: "Тест", message: "Тест" } });
  const history = await prisma.auditEvent.create({ data: { eventType: "TEST_HISTORY", entityType: "ADMIN_USER", entityId: operator.id } });
  const brief = await prisma.briefRequest.create({ data: { name: "Заявка для проверки", contact: "test@example.com", projectType: "WEBSITE", answers: {} } });
  const client = await prisma.clientUser.create({ data: { name: "Тестовый клиент", username: `client-${randomUUID()}`, passwordHash: "test" } });
  const project = await prisma.clientProject.create({ data: { clientId: client.id, briefId: brief.id, title: "Проект для проверки" } });
  const projectHistory = await prisma.auditEvent.create({ data: { eventType: "TEST_PROJECT_HISTORY", entityType: "ClientProject", entityId: project.id } });
  try {
    assert.ok(await adminRepository.findActiveById(operator.id));
    await deleteOperatorRecord(owner.id, operator.id);
    assert.equal(await prisma.adminUser.findUnique({ where: { id: operator.id } }), null);
    assert.equal(await adminRepository.findActiveById(operator.id), null);
    assert.equal(await prisma.notification.findUnique({ where: { id: notification.id } }), null);
    assert.ok(await prisma.auditEvent.findUnique({ where: { id: history.id } }));
    assert.ok(await prisma.briefRequest.findUnique({ where: { id: brief.id } }));
    assert.ok(await prisma.clientProject.findUnique({ where: { id: project.id } }));
    assert.ok(await prisma.auditEvent.findUnique({ where: { id: projectHistory.id } }));
    const deletion = await prisma.auditEvent.findFirst({ where: { eventType: "OPERATOR_DELETED", entityId: operator.id } });
    assert.deepEqual(deletion?.metadata, { actorId: owner.id });
  } finally {
    await prisma.auditEvent.deleteMany({ where: { entityType: "ADMIN_USER", entityId: operator.id } });
    await prisma.auditEvent.delete({ where: { id: projectHistory.id } });
    await prisma.clientProject.delete({ where: { id: project.id } });
    await prisma.briefRequest.delete({ where: { id: brief.id } });
    await prisma.clientUser.delete({ where: { id: client.id } });
    await prisma.adminUser.deleteMany({ where: { id: { in: [owner.id, operator.id] } } });
    await prisma.$disconnect();
  }
});

test("оператору и самоудалению отказано; владельцы защищены", async () => {
  const owner = await prisma.adminUser.create({ data: { username: `owner-${randomUUID()}`, passwordHash: "test", role: "owner" } });
  const anotherOwner = await prisma.adminUser.create({ data: { username: `owner-${randomUUID()}`, passwordHash: "test", role: "owner" } });
  const operator = await prisma.adminUser.create({ data: { username: `operator-${randomUUID()}`, passwordHash: "test", role: "operator" } });
  try {
    await assert.rejects(deleteOperatorRecord(operator.id, anotherOwner.id), OperatorDeletionError);
    await assert.rejects(deleteOperatorRecord(owner.id, owner.id), OperatorDeletionError);
    await assert.rejects(deleteOperatorRecord(owner.id, anotherOwner.id), OperatorDeletionError);
    await assert.rejects(deleteOperatorRecord(owner.id, randomUUID()), OperatorDeletionError);
    assert.equal(await prisma.adminUser.count({ where: { id: { in: [owner.id, anotherOwner.id, operator.id] } } }), 3);
  } finally {
    await prisma.adminUser.deleteMany({ where: { id: { in: [owner.id, anotherOwner.id, operator.id] } } });
    await prisma.$disconnect();
  }
});
