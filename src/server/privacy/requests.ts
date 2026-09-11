import { createHash, randomUUID } from "node:crypto";
import { rename, unlink } from "node:fs/promises";
import { prisma } from "@/server/db/prisma";
import { storagePath } from "@/server/storage/files";
import { WorkspaceError } from "@/server/client/service";
import { Prisma, type PersonalDataRequestChannel, type PersonalDataRequestKind, type PersonalDataRequestScope } from "@/generated/prisma/client";
import { appendAudit } from "@/server/security/audit-journal";
import { createPrivacyLookupHash, normalizePrivacyEmail, normalizePrivacyPhone, type PrivacyLookupType } from "@/server/privacy/lookup";

export const privacyCategories = ["ACCOUNT", "BRIEF", "PROJECTS", "FILES", "NOTIFICATIONS", "HISTORY"] as const;
export type PrivacyCategory = (typeof privacyCategories)[number];

export function addPrivacyReceiptRetention(executedAt: Date) {
  const expiresAt = new Date(executedAt);
  const month = expiresAt.getUTCMonth();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 3);
  if (expiresAt.getUTCMonth() !== month) expiresAt.setUTCDate(0);
  return expiresAt;
}

const categoryLabels: Record<PrivacyCategory, string> = {
  ACCOUNT: "аккаунт и контактные данные",
  BRIEF: "заявки и их содержимое",
  PROJECTS: "проекты, этапы, решения и платежные сведения",
  FILES: "материалы и физические файлы",
  NOTIFICATIONS: "уведомления и попытки доставки",
  HISTORY: "служебная история и события",
};

type Preview = {
  targetExists: boolean;
  label: string;
  clientId: string | null;
  briefIds: string[];
  projectIds: string[];
  identity: { name: string; email: string | null; phone: string | null; account: string | null };
  briefs: { id: string; number: number; name: string }[];
  projects: { id: string; title: string }[];
  materials: { id: string; title: string; kind: string }[];
  counts: { briefs: number; projects: number; files: number; bytes: number; materials: number; notifications: number; events: number };
};

export async function previewTarget(scope: PersonalDataRequestScope, targetId: string): Promise<Preview> {
  if (scope === "BRIEF") {
    const brief = await prisma.briefRequest.findUnique({ where: { id: targetId }, include: { project: { select: { id: true, clientId: true } } } });
    if (!brief) return emptyPreview();
    return aggregatePreview(`Заявка № ${brief.number}`, brief.project?.clientId ?? null, [brief.id], []);
  }
  if (scope === "PROJECT") {
    const project = await prisma.clientProject.findUnique({ where: { id: targetId }, select: { id: true, title: true, clientId: true, briefId: true } });
    if (!project) return emptyPreview();
    return aggregatePreview(project.title, project.clientId, project.briefId ? [project.briefId] : [], [project.id]);
  }
  const client = await prisma.clientUser.findUnique({ where: { id: targetId }, select: { id: true, name: true, projects: { select: { id: true, briefId: true } } } });
  if (!client) return emptyPreview();
  const projectIds = client.projects.map(item => item.id);
  const briefIds = client.projects.flatMap(item => item.briefId ? [item.briefId] : []);
  return aggregatePreview(client.name, client.id, briefIds, projectIds);
}

function emptyPreview(): Preview {
  return { targetExists: false, label: "Объект не найден", clientId: null, briefIds: [], projectIds: [], identity: { name: "", email: null, phone: null, account: null }, briefs: [], projects: [], materials: [], counts: { briefs: 0, projects: 0, files: 0, bytes: 0, materials: 0, notifications: 0, events: 0 } };
}

async function aggregatePreview(label: string, clientId: string | null, briefIds: string[], projectIds: string[]): Promise<Preview> {
  const projectFilter = { in: projectIds };
  const [files, materialRows, notifications, events, client, briefRows, projectRows] = await Promise.all([
    prisma.storedFile.aggregate({ where: { projectId: projectFilter, physicalDeletedAt: null }, _count: true, _sum: { size: true } }),
    prisma.projectMaterial.findMany({ where: { projectId: projectFilter }, select: { id: true, title: true, kind: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { OR: [{ projectId: projectFilter }, ...(clientId ? [{ recipientClientId: clientId }] : [])] } }),
    prisma.projectEvent.count({ where: { projectId: projectFilter } }),
    clientId ? prisma.clientUser.findUnique({ where: { id: clientId }, select: { name: true, email: true, phone: true, username: true } }) : null,
    prisma.briefRequest.findMany({ where: { id: { in: briefIds } }, select: { id: true, number: true, name: true, contact: true, contactType: true }, orderBy: { createdAt: "desc" } }),
    prisma.clientProject.findMany({ where: { id: projectFilter }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const briefEmail = briefRows.find(item => item.contactType === "EMAIL")?.contact
    ?? briefRows.map(item => item.contact).find(contact => { try { normalizePrivacyEmail(contact); return true; } catch { return false; } }) ?? null;
  const briefPhone = briefRows.find(item => item.contactType === "PHONE")?.contact
    ?? briefRows.map(item => item.contact).find(contact => { try { normalizePrivacyPhone(contact); return true; } catch { return false; } }) ?? null;
  return {
    targetExists: true, label, clientId, briefIds, projectIds,
    identity: { name: client?.name ?? briefRows[0]?.name ?? label, email: client?.email ?? briefEmail, phone: client?.phone ?? briefPhone, account: client?.username ?? null },
    briefs: briefRows.map(({ id, number, name }) => ({ id, number, name })), projects: projectRows, materials: materialRows,
    counts: { briefs: briefRows.length, projects: projectRows.length, files: files._count, bytes: files._sum.size ?? 0, materials: materialRows.length, notifications, events },
  };
}

export async function registerPrivacyRequest(input: { kind: PersonalDataRequestKind; scope: PersonalDataRequestScope; targetId: string; receivedAt: Date; dueAt?: Date | null; channel: PersonalDataRequestChannel; lookupValue?: string | null }) {
  const preview = await previewTarget(input.scope, input.targetId);
  if (!preview.targetExists) throw new WorkspaceError("Выбранный объект больше не существует. Обновите страницу.");
  let lookupType: PrivacyLookupType = "NONE";
  let lookupHash: string | null = null;
  if (input.channel === "EMAIL" || input.channel === "PHONE") {
    if (!input.lookupValue?.trim()) throw new WorkspaceError(input.channel === "EMAIL" ? "Укажите email, с которого поступил запрос." : "Укажите телефон, с которого поступил запрос.");
    lookupType = input.channel;
    try { lookupHash = createPrivacyLookupHash(lookupType, input.lookupValue); }
    catch (error) { throw new WorkspaceError(error instanceof Error ? error.message : "Проверьте контакт для сопоставления."); }
  }
  return prisma.$transaction(async tx => {
    const request = await tx.personalDataRequest.create({ data: { kind: input.kind, scope: input.scope, targetId: input.targetId, receivedAt: input.receivedAt, dueAt: input.dueAt, channel: input.channel, lookupType, lookupHash } });
    await appendAudit(tx, { eventType: "PRIVACY_REQUEST_REGISTERED", entityType: "PERSONAL_DATA_REQUEST", entityId: request.id, metadata: { requestNumber: request.number, kind: request.kind, scope: request.scope, channel: request.channel } });
    return request;
  });
}

export function validateExclusions(scope: PersonalDataRequestScope, excluded: PrivacyCategory[]) {
  const set = new Set(excluded);
  if (scope === "BRIEF" && excluded.some(item => item !== "BRIEF" && item !== "HISTORY")) throw new WorkspaceError("Для отдельной заявки доступны только категории заявки и истории.");
  if (scope === "PROJECT" && set.has("FILES") && !set.has("PROJECTS")) throw new WorkspaceError("Файлы нельзя сохранить после удаления проекта: сохраните также категорию проектов.");
  if (scope === "PROJECT" && set.has("HISTORY") && !set.has("PROJECTS")) throw new WorkspaceError("Историю проекта нельзя сохранить без самого проекта.");
  if (scope === "PROJECT" && set.has("NOTIFICATIONS") && !set.has("PROJECTS")) throw new WorkspaceError("Уведомления проекта нельзя сохранить после удаления проекта.");
  if (scope === "CLIENT" && set.has("PROJECTS") && !set.has("ACCOUNT")) throw new WorkspaceError("Аккаунт нельзя удалить, пока сохраняются принадлежащие ему проекты.");
  if (scope === "CLIENT" && set.has("FILES") && !set.has("PROJECTS")) throw new WorkspaceError("Файлы нельзя сохранить после удаления проектов.");
  if (scope === "CLIENT" && set.has("HISTORY") && !set.has("PROJECTS")) throw new WorkspaceError("Проектную историю нельзя сохранить после удаления проектов.");
  if (scope === "CLIENT" && set.has("NOTIFICATIONS") && !set.has("ACCOUNT")) throw new WorkspaceError("Уведомления клиента нельзя сохранить после удаления аккаунта.");
  if (scope === "CLIENT" && set.has("NOTIFICATIONS") && !set.has("PROJECTS")) throw new WorkspaceError("Уведомления проектов нельзя сохранить после удаления самих проектов.");
}

export async function preparePrivacyRequest(requestId: string, excluded: PrivacyCategory[], reason: string | null) {
  const request = await prisma.personalDataRequest.findUnique({ where: { id: requestId } });
  if (!request?.targetId || request.status !== "REGISTERED") throw new WorkspaceError("Запрос уже изменён. Обновите страницу.");
  if (!request.scope) throw new WorkspaceError("Запрос уже очищен по сроку хранения.");
  validateExclusions(request.scope, excluded);
  if (excluded.length && (!reason || reason.trim().length < 10)) throw new WorkspaceError("Для сохранения категории укажите иное законное основание или исключение.");
  const preview = await previewTarget(request.scope, request.targetId);
  if (!preview.targetExists) throw new WorkspaceError("Целевой объект больше не существует.");
  return prisma.$transaction(async tx => {
    const updated = await tx.personalDataRequest.update({ where: { id: request.id }, data: { status: "READY", excludedCategories: excluded, exclusionReason: excluded.length ? reason!.trim() : null } });
    await appendAudit(tx, { eventType: "PRIVACY_REQUEST_PREPARED", entityType: "PERSONAL_DATA_REQUEST", entityId: request.id, metadata: { requestNumber: request.number, excludedCategoryCount: excluded.length } });
    return updated;
  });
}

type QuarantinedFile = { id: string; source: string; quarantine: string | null };

async function quarantineFiles(projectIds: string[]): Promise<QuarantinedFile[]> {
  const files = await prisma.storedFile.findMany({ where: { projectId: { in: projectIds }, physicalDeletedAt: null }, select: { id: true } });
  const moved: QuarantinedFile[] = [];
  try {
    for (const file of files) {
      const source = storagePath(file.id);
      const quarantine = `${source}.deleting-${randomUUID()}`;
      try { await rename(source, quarantine); moved.push({ id: file.id, source, quarantine }); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") moved.push({ id: file.id, source, quarantine: null });
        else throw error;
      }
    }
    return moved;
  } catch (error) {
    await Promise.all(moved.flatMap(file => file.quarantine ? [rename(file.quarantine, file.source).catch(() => undefined)] : []));
    throw error;
  }
}

function jsonContains(value: Prisma.JsonValue | null | undefined, targets: Set<string>): boolean {
  if (typeof value === "string") return targets.has(value);
  if (Array.isArray(value)) return value.some(item => jsonContains(item, targets));
  if (value && typeof value === "object") return Object.values(value).some(item => jsonContains(item, targets));
  return false;
}

async function eraseAuditLinks(tx: Prisma.TransactionClient, ids: string[]) {
  const targets = new Set(ids.flatMap(id => [id, createHash("sha256").update(id).digest("hex")]));
  const events = await tx.auditEvent.findMany({ select: { id: true, entityId: true, metadata: true } });
  const eventIds = events.filter(item => targets.has(item.entityId) || jsonContains(item.metadata, targets)).map(item => item.id);
  if (eventIds.length) await tx.auditEvent.deleteMany({ where: { id: { in: eventIds } } });
}

export async function executePrivacyRequest(requestId: string, confirmation: string) {
  const request = await prisma.personalDataRequest.findUnique({ where: { id: requestId } });
  if (!request?.targetId || request.status !== "READY") throw new WorkspaceError("Запрос не готов к исполнению. Обновите страницу.");
  if (confirmation.trim() !== `УДАЛИТЬ ${request.number}`) throw new WorkspaceError(`Введите точную фразу «УДАЛИТЬ ${request.number}».`);
  if (!request.scope) throw new WorkspaceError("Запрос уже очищен по сроку хранения.");
  const excluded = new Set((Array.isArray(request.excludedCategories) ? request.excludedCategories : []) as PrivacyCategory[]);
  validateExclusions(request.scope, [...excluded]);
  const preview = await previewTarget(request.scope, request.targetId);
  if (!preview.targetExists) throw new WorkspaceError("Состав данных изменился: целевой объект не найден.");
  if ((request.lookupType === "EMAIL" || request.lookupType === "PHONE") && !request.lookupHash) throw new WorkspaceError("Исполнение остановлено: у запроса отсутствует защищённый идентификатор.");
  if (request.lookupType === "NONE" && request.lookupHash) throw new WorkspaceError("Исполнение остановлено: квитанция содержит несовместимый тип идентификатора.");

  const deleteProjects = request.scope !== "BRIEF" && !excluded.has("PROJECTS");
  const deleteBriefs = !excluded.has("BRIEF");
  const deleteFiles = preview.projectIds.length > 0 && !excluded.has("FILES");
  const quarantined = deleteFiles ? await quarantineFiles(preview.projectIds) : [];
  const destroyed: PrivacyCategory[] = [];
  try {
    await prisma.$transaction(async tx => {
      if (!excluded.has("NOTIFICATIONS")) {
        await tx.notification.deleteMany({ where: { OR: [{ projectId: { in: preview.projectIds } }, ...(request.scope === "CLIENT" && preview.clientId ? [{ recipientClientId: preview.clientId }] : [])] } });
        destroyed.push("NOTIFICATIONS");
      }
      if (deleteProjects) {
        await tx.stageDecision.deleteMany({ where: { version: { stage: { projectId: { in: preview.projectIds } } } } });
        await tx.versionMaterial.deleteMany({ where: { version: { stage: { projectId: { in: preview.projectIds } } } } });
        await tx.projectMaterial.deleteMany({ where: { projectId: { in: preview.projectIds } } });
        await tx.stageVersion.deleteMany({ where: { stage: { projectId: { in: preview.projectIds } } } });
        await tx.projectStage.deleteMany({ where: { projectId: { in: preview.projectIds } } });
        await tx.projectPayment.deleteMany({ where: { projectId: { in: preview.projectIds } } });
        await tx.projectEvent.deleteMany({ where: { projectId: { in: preview.projectIds } } });
        await tx.storedFile.deleteMany({ where: { projectId: { in: preview.projectIds } } });
        await tx.clientProject.deleteMany({ where: { id: { in: preview.projectIds }, ...(preview.clientId ? { clientId: preview.clientId } : {}) } });
        destroyed.push("PROJECTS");
        if (deleteFiles) destroyed.push("FILES");
      } else if (deleteFiles) {
        await tx.versionMaterial.updateMany({ where: { fileId: { in: quarantined.map(file => file.id) } }, data: { fileId: null } });
        await tx.projectMaterial.updateMany({ where: { fileId: { in: quarantined.map(file => file.id) } }, data: { fileId: null } });
        await tx.storedFile.deleteMany({ where: { id: { in: quarantined.map(file => file.id) }, projectId: { in: preview.projectIds } } });
        destroyed.push("FILES");
      }
      if (deleteBriefs && preview.briefIds.length) {
        await tx.clientProject.updateMany({ where: { briefId: { in: preview.briefIds } }, data: { briefId: null } });
        await tx.briefRequest.deleteMany({ where: { id: { in: preview.briefIds } } });
        destroyed.push("BRIEF");
      }
      if (!excluded.has("HISTORY")) { await eraseAuditLinks(tx, [request.targetId!, ...preview.projectIds, ...preview.briefIds, ...(preview.clientId ? [preview.clientId] : [])]); destroyed.push("HISTORY"); }
      if (request.scope === "CLIENT" && preview.clientId && !excluded.has("ACCOUNT")) {
        const externalDecisions = await tx.stageDecision.count({ where: { clientId: preview.clientId } });
        const remainingProjects = await tx.clientProject.count({ where: { clientId: preview.clientId } });
        if (externalDecisions || remainingProjects) throw new WorkspaceError("Обнаружены связи вне рассчитанной области. Удаление аккаунта остановлено.");
        await tx.clientUser.delete({ where: { id: preview.clientId } });
        destroyed.push("ACCOUNT");
      }
      const completedAt = new Date();
      await tx.personalDataRequest.update({ where: { id: request.id }, data: { targetId: null, kind: null, exclusionReason: null, status: "COMPLETED", completedAt, receiptExpiresAt: addPrivacyReceiptRetention(completedAt), destroyedCategories: destroyed.map(item => categoryLabels[item]), result: excluded.size ? "PARTIALLY_PRESERVED" : "DESTROYED", storageWarnings: 0 } });
      await appendAudit(tx, { eventType: "PRIVACY_REQUEST_COMPLETED", entityType: "PERSONAL_DATA_REQUEST", entityId: request.id, metadata: { requestNumber: request.number, destroyedCategoryCount: destroyed.length, result: excluded.size ? "PARTIALLY_PRESERVED" : "DESTROYED", storageWarnings: 0 } });
    });
  } catch (error) {
    await Promise.all(quarantined.flatMap(file => file.quarantine ? [rename(file.quarantine, file.source).catch(() => undefined)] : []));
    throw error;
  }
  let warnings = 0;
  for (const file of quarantined) if (file.quarantine) try { await unlink(file.quarantine); } catch { warnings++; }
  if (warnings) await prisma.personalDataRequest.update({ where: { id: request.id }, data: { status: "COMPLETED_WITH_WARNINGS", storageWarnings: warnings } });
  return { number: request.number, warnings };
}

export async function cleanupExpiredPrivacyReceipts(now = new Date()) {
  return prisma.$transaction(async tx => {
    const expired = await tx.personalDataRequest.findMany({
      where: { receiptPurgedAt: null, receiptExpiresAt: { lte: now } },
      select: { id: true },
    });
    if (!expired.length) return { receipts: 0 };
    const ids = expired.map(item => item.id);
    await tx.auditEvent.deleteMany({ where: { entityType: "PERSONAL_DATA_REQUEST", entityId: { in: ids } } });
    const result = await tx.personalDataRequest.updateMany({
      where: { id: { in: ids }, receiptPurgedAt: null, receiptExpiresAt: { lte: now } },
      data: {
        kind: null, scope: null, targetId: null, receivedAt: null, dueAt: null, completedAt: null,
        receiptExpiresAt: null, receiptPurgedAt: now, excludedCategories: Prisma.DbNull,
        exclusionReason: null, destroyedCategories: Prisma.DbNull, result: null, channel: null,
        lookupType: "NONE", lookupHash: null, storageWarnings: 0, createdAt: null,
      },
    });
    if (result.count) await appendAudit(tx, { eventType: "PRIVACY_RECEIPTS_PURGED", entityType: "SYSTEM", entityId: "privacy-receipt-retention", metadata: { count: result.count } });
    return { receipts: result.count };
  });
}
