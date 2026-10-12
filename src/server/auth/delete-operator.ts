import { prisma } from "@/server/db/prisma";
import { appendAudit } from "@/server/security/audit-journal";

export class OperatorDeletionError extends Error {}

export async function deleteOperatorRecord(actorId: string, targetId: string) {
  if (actorId === targetId) throw new OperatorDeletionError("Нельзя удалить собственную учётную запись.");

  await prisma.$transaction(async tx => {
    const actor = await tx.adminUser.findUnique({ where: { id: actorId }, select: { role: true, active: true } });
    if (actor?.role !== "owner" || !actor.active) throw new OperatorDeletionError("Удалять операторов может только владелец.");

    // Условие в DELETE защищает владельца и от конкурентной смены роли.
    const deleted = await tx.adminUser.deleteMany({ where: { id: targetId, role: "operator" } });
    if (deleted.count !== 1) throw new OperatorDeletionError("Оператор не найден или его нельзя удалить.");

    await appendAudit(tx, { eventType: "OPERATOR_DELETED", entityType: "ADMIN_USER", entityId: targetId, metadata: { actorId } });
  });
}
