import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { appendAudit, listJournal, sanitizeAuditMetadata } from "./audit-journal";

test("журнал: RBAC, allowlist, фильтры и серверная пагинация", async () => {
  const entityId = randomUUID(); const eventType = `TEST_JOURNAL_${entityId}`;
  try {
    await prisma.$transaction(async tx => { for (let index = 0; index < 12; index++) await appendAudit(tx, { eventType, entityType: "SYSTEM", entityId, metadata: { email: "must-not-leak@example.test", content: "secret", count: index } }); });
    await assert.rejects(listJournal({ eventType }, { side: "CLIENT" }));
    const first = await listJournal({ eventType, category: "SYSTEM", page: 1, pageSize: 10 }, { side: "ADMIN" });
    const second = await listJournal({ eventType, category: "SYSTEM", page: 2, pageSize: 10 }, { side: "ADMIN" });
    assert.equal(first.total, 12); assert.equal(first.items.length, 10); assert.equal(second.items.length, 2);
    assert.deepEqual(first.items[0].metadata, undefined);
    assert.equal(JSON.stringify(first.items).includes("must-not-leak"), false);
  } finally { await prisma.auditEvent.deleteMany({ where: { eventType } }); await prisma.$disconnect(); }
});

test("санитизация metadata сохраняет только разрешённые неперсональные поля", () => {
  assert.deepEqual(sanitizeAuditMetadata("PAYMENT_UPDATED", { status: "PAID", hasPaidDate: true, amount: 5000, email: "x@example.test", title: "Личный платёж" }), { status: "PAID", hasPaidDate: true });
});
