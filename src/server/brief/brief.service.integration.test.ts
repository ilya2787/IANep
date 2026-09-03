import assert from "node:assert/strict";
import test from "node:test";

import { BriefRequestStatus } from "@/generated/prisma/enums";
import { briefService } from "@/server/brief/brief.service";
import { BriefRepository } from "@/server/brief/brief.repository";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

test("отправка Brief создаёт заявку и событие аудита", async () => {
  let briefRequestId: string | undefined;

  try {
    const briefRequest = await briefService.submit({
      name: "Интеграционный тест",
      contact: "test@example.com",
      projectType: "WEBSITE",
      answers: {
        goal: "Проверить серверный слой",
      },
      source: "INTEGRATION_TEST",
    });

    briefRequestId = briefRequest.id;

    assert.equal(briefRequest.status, BriefRequestStatus.NEW);
    assert.equal(briefRequest.source, "INTEGRATION_TEST");

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "BriefRequest",
        entityId: briefRequest.id,
      },
    });

    assert.ok(auditEvent);
    assert.equal(auditEvent.eventType, "BRIEF_CREATED");
    assert.deepEqual(auditEvent.metadata, {
      source: "INTEGRATION_TEST",
    });
  } finally {
    if (briefRequestId) {
      await prisma.$transaction([
        prisma.auditEvent.deleteMany({
          where: {
            entityType: "BriefRequest",
            entityId: briefRequestId,
          },
        }),
        prisma.briefRequest.delete({
          where: {
            id: briefRequestId,
          },
        }),
      ]);
    }

    await prisma.$disconnect();
  }
});


test("ошибка аудита откатывает создание заявки", async () => {
  let rolledBackId: string | undefined;
  const repository = new BriefRepository({
    $transaction: (operation: (transaction: unknown) => Promise<unknown>) =>
      prisma.$transaction(async (transaction) => operation({
        briefRequest: {
          create: async (args: Parameters<typeof transaction.briefRequest.create>[0]) => {
            const request = await transaction.briefRequest.create(args);
            rolledBackId = request.id;
            return request;
          },
        },
        auditEvent: { create: async () => { throw new Error("Проверка отката"); } },
      })),
  } as unknown as PrismaClient);
  try {
    await assert.rejects(repository.create({
      name: "Проверка отката", contact: "rollback@example.com",
      projectType: "WEBSITE", answers: { goal: "Проверка транзакции" },
      source: "INTEGRATION_TEST",
    }), /Проверка отката/);
    assert.ok(rolledBackId);
    assert.equal(await prisma.briefRequest.findUnique({ where: { id: rolledBackId } }), null);
    assert.equal(await prisma.auditEvent.count({ where: { entityId: rolledBackId } }), 0);
  } finally {
    await prisma.$disconnect();
  }
});

test('ошибка аудита откатывает замену предыдущей заявки', async () => {
  const original = await prisma.briefRequest.create({ data: {
    name: 'Проверка замены', contact: 'replace-test@example.com', projectType: 'landing-page', answers: { description: 'До замены' },
  } });
  const repository = new BriefRepository({
    $transaction: (operation: (transaction: unknown) => Promise<unknown>) => prisma.$transaction(async (transaction) => operation({
      briefRequest: transaction.briefRequest,
      auditEvent: { create: async () => { throw new Error('Проверка отката замены'); } },
    })),
  } as unknown as PrismaClient);
  try {
    await assert.rejects(repository.replace(original, {
      name: original.name, contact: original.contact, projectType: original.projectType, answers: { description: 'После замены' },
    }), /Проверка отката замены/);
    const saved = await prisma.briefRequest.findUniqueOrThrow({ where: { id: original.id } });
    assert.deepEqual(saved.answers, { description: 'До замены' });
    assert.equal(saved.number, original.number);
  } finally {
    await prisma.briefRequest.delete({ where: { id: original.id } });
    await prisma.$disconnect();
  }
});
