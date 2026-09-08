import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { WorkspaceError } from "@/server/client/service";

export async function clientDependencies(id: string) {
  const hashedId = createHash("sha256").update(id).digest("hex");
  const [projects, decisions, notifications, audit] = await Promise.all([
    prisma.clientProject.count({ where: { clientId: id } }),
    prisma.stageDecision.count({ where: { clientId: id } }),
    prisma.notification.count({ where: { recipientClientId: id } }),
    prisma.auditEvent.count({ where: { OR: [{ entityId: id }, { entityId: hashedId }] } }),
  ]);
  return { projects, decisions, notifications, audit, total: projects + decisions + notifications + audit };
}

export async function setClientActive(id: string, active: boolean, adminId: string) {
  const updated = await prisma.clientUser.updateMany({ where: { id }, data: { active, sessionVersion: { increment: 1 } } });
  if (!updated.count) throw new WorkspaceError("Пользователь не найден.");
  await prisma.auditEvent.create({ data: { eventType: active ? "CLIENT_REACTIVATED" : "CLIENT_DEACTIVATED", entityType: "CLIENT_USER", entityId: id, metadata: { adminId, sessionsRevoked: true } } });
}

export async function deleteUnusedClient(id: string, adminId: string) {
  const dependencies = await clientDependencies(id);
  if (dependencies.total) throw new WorkspaceError("Физическое удаление запрещено: у пользователя есть связанная история. Используйте блокировку.");
  const deleted = await prisma.clientUser.deleteMany({ where: { id } });
  if (!deleted.count) throw new WorkspaceError("Пользователь не найден.");
  await prisma.auditEvent.create({ data: { eventType: "UNUSED_CLIENT_DELETED", entityType: "SECURITY", entityId: id, metadata: { adminId, dependencyCheck: dependencies } } });
}
