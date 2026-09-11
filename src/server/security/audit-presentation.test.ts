import assert from "node:assert/strict";
import test from "node:test";
import { presentAuditEvent, translateAuditValue } from "./audit-presentation";

test("presentation-слой полностью скрывает технические ключи журнала", () => {
  const presented = presentAuditEvent({ eventType: "PROJECT_UPDATED", entityType: "PROJECT", entityId: "12345678-aaaa-bbbb-cccc-123456789012", category: "PROJECTS", source: "AUDIT", metadata: { previousStatus: "IN_PROGRESS", newStatus: "IN_REVIEW", actorSide: "ADMIN" } });
  assert.deepEqual(presented.details, ["Было: В работе", "Стало: На согласовании", "Инициатор: Администратор"]);
  assert.equal(presented.action, "Проект обновлён");
  assert.equal(JSON.stringify(presented).includes("PROJECT_UPDATED"), false);
  assert.equal(JSON.stringify(presented).includes("IN_PROGRESS"), false);
});

test("неизвестный enum не попадает в интерфейс как сырой ключ", () => {
  assert.equal(translateAuditValue("FUTURE_TECHNICAL_VALUE"), "Служебное значение");
});
