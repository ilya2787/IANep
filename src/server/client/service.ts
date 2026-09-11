import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { idSchema, attachmentSchema, textSchema, titleSchema } from "./model";
import { enqueueForActiveAdmins, enqueueNotification } from "@/server/notifications/service";
import { appendAudit } from "@/server/security/audit-journal";

export type Actor = { id: string; side: "ADMIN" | "CLIENT" };
export class WorkspaceError extends Error {}
export const projectInclude = { brief: { select: { id: true, number: true } }, client: { select: { name: true, id: true, username: true, active: true } }, stages: { orderBy: { position: "asc" as const }, include: { versions: { orderBy: { number: "desc" as const }, include: { materials: { include: { file: { select: { physicalDeletedAt: true } } } }, decision: true } } } }, materials: { orderBy: { createdAt: "desc" as const }, include: { file: { select: { physicalDeletedAt: true } } } }, payments: { orderBy: { dueAt: "asc" as const } }, events: { orderBy: { createdAt: "desc" as const } } };
export type ProjectDetail = Prisma.ClientProjectGetPayload<{ include: typeof projectInclude }>;
export async function readProject(projectId: string, actor: Actor) {
  if (!idSchema.safeParse(projectId).success) return null;
  return prisma.clientProject.findFirst({ where: { id: projectId, ...(actor.side === "CLIENT" ? { clientId: actor.id, archivedAt: null } : {}) }, include: projectInclude });
}
export async function withProject<T>(projectId: string, actor: Actor, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  idSchema.parse(projectId);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM client_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
    const project = await tx.clientProject.findFirst({ where: { id: projectId, ...(actor.side === "CLIENT" ? { clientId: actor.id, archivedAt: null } : {}) } });
    if (!project) throw new WorkspaceError("Проект не найден или недоступен.");
    return work(tx);
  });
}
export async function event(tx: Prisma.TransactionClient, projectId: string, actor: Actor, type: string, message: string, metadata: Record<string, unknown> = {}) {
  await tx.projectEvent.create({ data: { projectId, actorId: actor.id, actorSide: actor.side, type, message } });
  await appendAudit(tx, { eventType: type, entityType: "PROJECT", entityId: projectId, metadata: { actorSide: actor.side, ...metadata } });
}
function admin(actor: Actor) { if (actor.side !== "ADMIN") throw new WorkspaceError("Действие доступно только администратору."); }
export async function publish(projectId: string, actor: Actor, input: unknown) {
  admin(actor);
  const data = z.object({ stageId: idSchema, comment: textSchema.min(1), materials: z.array(attachmentSchema).min(1).max(20) }).parse(input);
  return withProject(projectId, actor, async tx => {
    const stage = await tx.projectStage.findFirst({ where: { id: data.stageId, projectId, archivedAt: null }, include: { versions: { orderBy: { number: "desc" }, take: 1, include: { decision: true } } } });
    if (!stage) throw new WorkspaceError("Этап не найден.");
    const latest = stage.versions[0];
    if (latest && !latest.decision) throw new WorkspaceError("Сначала дождитесь решения по опубликованной версии.");
    const materials = await Promise.all(data.materials.map(material => resolveAttachment(tx, projectId, actor, material)));
    const version = await tx.stageVersion.create({ data: { stageId: stage.id, number: (latest?.number ?? 0) + 1, comment: data.comment, authorId: actor.id, materials: { create: materials } } });
    await tx.projectStage.update({ where: { id: stage.id }, data: { status: "IN_REVIEW" } });
    await tx.clientProject.updateMany({ where: { id: projectId, status: "PREPARATION" }, data: { status: "IN_PROGRESS" } });
    await event(tx, projectId, actor, "RESULT_PUBLISHED", `Проверьте результат: ${stage.title}, версия ${version.number}.`);
    const project = await tx.clientProject.findUniqueOrThrow({ where: { id: projectId }, select: { clientId: true } });
    await enqueueNotification(tx, { recipient: { clientId: project.clientId }, projectId, eventType: "RESULT_PUBLISHED", title: "Новая версия готова к проверке", message: `${stage.title}, версия ${version.number}.`, href: `/client/projects/${projectId}?tab=approvals&stage=${stage.id}`, email: true });
    return version;
  });
}
export async function decide(projectId: string, actor: Actor, input: unknown) {
  if (actor.side !== "CLIENT") throw new WorkspaceError("Решение принимает клиент проекта.");
  const data = z.object({ versionId: idSchema, kind: z.enum(["ACCEPTED", "CHANGES"]), changes: textSchema }).parse(input);
  if (data.kind === "CHANGES" && !data.changes) throw new WorkspaceError("Соберите правки в один список и заполните поле.");
  return withProject(projectId, actor, async tx => {
    const version = await tx.stageVersion.findFirst({ where: { id: data.versionId, stage: { projectId, archivedAt: null } }, include: { stage: true, decision: true } });
    if (!version) throw new WorkspaceError("Версия недоступна.");
    const latest = await tx.stageVersion.findFirst({ where: { stageId: version.stageId }, orderBy: { number: "desc" } });
    if (version.decision || latest?.id !== version.id || version.stage.status !== "IN_REVIEW") throw new WorkspaceError("Решение уже сохранено или версия больше не ожидает согласования. Обновите страницу.");
    const decision = await tx.stageDecision.create({ data: { versionId: version.id, clientId: actor.id, kind: data.kind, changes: data.kind === "CHANGES" ? data.changes : "", countsTowardLimit: data.kind === "CHANGES" } });
    await tx.projectStage.update({ where: { id: version.stageId }, data: { status: data.kind === "ACCEPTED" ? "COMPLETED" : "REVISION" } });
    await event(tx, projectId, actor, data.kind, `${version.stage.title}, версия ${version.number}: ${data.kind === "ACCEPTED" ? "этап принят" : "отправлен список правок"}.`);
    await enqueueForActiveAdmins(tx, { projectId, eventType: data.kind, title: data.kind === "ACCEPTED" ? "Клиент принял этап" : "Клиент отправил правки", message: `${version.stage.title}, версия ${version.number}.`, href: `/admin/projects/${projectId}?tab=approvals&stage=${version.stageId}` });
    return decision;
  });
}
export async function addStage(projectId: string, actor: Actor, title: unknown) {
  admin(actor); const name = titleSchema.parse(title);
  return withProject(projectId, actor, async tx => {
    const last = await tx.projectStage.aggregate({ where: { projectId }, _max: { position: true } });
    const stage = await tx.projectStage.create({ data: { projectId, title: name, position: (last._max.position ?? 0) + 1 } });
    await event(tx, projectId, actor, "STAGE_CREATED", `Добавлен этап «${name}».`); return stage;
  });
}

export async function resolveAttachment(tx: Prisma.TransactionClient, projectId: string, actor: Actor, input: unknown) {
  const material = attachmentSchema.parse(input);
  if (!("fileId" in material)) return material;
  const file = await tx.storedFile.findFirst({ where: { id: material.fileId, projectId, ...(actor.side === "CLIENT" ? { authorId: actor.id, authorSide: "CLIENT" } : {}) } });
  if (!file) throw new WorkspaceError("Файл не найден в этом проекте. Загрузите его снова.");
  return { title: material.title, kind: file.kind, fileId: file.id, url: `/api/files/${file.id}` };
}
