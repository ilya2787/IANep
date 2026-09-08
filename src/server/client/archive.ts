import { getSystemSettings } from "@/server/system/settings";
import { event, withProject, WorkspaceError, type Actor } from "./service";

const DAY = 24 * 60 * 60 * 1000;
export const retentionDays = [30, 90, 180, 365, 730] as const;

export async function archiveProject(projectId: string, actor: Actor, days: number | null) {
  if (actor.side !== "ADMIN") throw new WorkspaceError("Действие доступно только администратору.");
  if (days !== null && (!Number.isInteger(days) || days < 30 || days > 3650)) throw new WorkspaceError("Срок хранения должен быть от 30 дней до 10 лет.");
  return withProject(projectId, actor, async tx => {
    const archivedAt = new Date();
    const deleteAfter = days === null ? null : new Date(archivedAt.getTime() + days * DAY);
    await tx.clientProject.update({ where: { id: projectId }, data: { archivedAt, deleteAfter } });
    await event(tx, projectId, actor, "PROJECT_ARCHIVED", deleteAfter ? `Проект перенесён в архив. После ${deleteAfter.toLocaleDateString("ru-RU", { timeZone: "UTC" })} файлы станут кандидатами на ручную очистку.` : "Проект перенесён в архив без срока очистки.");
  });
}

export async function restoreProject(projectId: string, actor: Actor) {
  if (actor.side !== "ADMIN") throw new WorkspaceError("Действие доступно только администратору.");
  return withProject(projectId, actor, async tx => {
    const project = await tx.clientProject.findUnique({ where: { id: projectId }, select: { archivedAt: true } });
    if (!project?.archivedAt) throw new WorkspaceError("Проект уже находится в активных.");
    await tx.clientProject.update({ where: { id: projectId }, data: { archivedAt: null, deleteAfter: null } });
    await event(tx, projectId, actor, "PROJECT_RESTORED", "Проект восстановлен из архива.");
  });
}

export async function purgeExpiredProjects(_now = new Date(), limit = 100) {
  const settings = await getSystemSettings();
  if (!settings.automaticCleanupEnabled) return 0;
  const { cleanupCandidates, cleanArchivedProjectFiles } = await import("@/server/storage/lifecycle");
  const due = (await cleanupCandidates(_now)).slice(0, limit);
  if (!due.length) return 0;
  await cleanArchivedProjectFiles(due.map(project => project.id), "SYSTEM_SCHEDULED_CLEANUP");
  return due.length;
}
