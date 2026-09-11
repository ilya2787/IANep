import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export const journalCategories = ["BRIEFS", "PROJECTS", "CLIENTS", "PAYMENTS", "MATERIALS", "NOTIFICATIONS", "PRIVACY", "SYSTEM"] as const;
export type JournalCategory = (typeof journalCategories)[number];

const metadataAllowlist: Record<string, readonly string[]> = {
  BRIEF_CREATED: ["source", "receiptHash"], BRIEF_UPDATED: ["source"], BRIEF_STATUS_CHANGED: ["previousStatus", "newStatus", "actor"], BRIEF_PROJECT_CREATED: ["previousStatus", "newStatus", "actor"],
  CLIENT_CREATED: ["actorSide"], CLIENT_DEACTIVATED: ["sessionsRevoked"], CLIENT_REACTIVATED: ["sessionsRevoked"], UNUSED_CLIENT_DELETED: ["dependencyCount"],
  PROJECT_CREATED: ["actorSide"], PROJECT_UPDATED: ["previousStatus", "newStatus", "actorSide"], PROJECT_ARCHIVED: ["actorSide", "retentionDays"], PROJECT_RESTORED: ["actorSide"],
  STAGE_CREATED: ["actorSide"], STAGE_UPDATED: ["actorSide"], STAGE_ARCHIVED: ["actorSide"], RESULT_PUBLISHED: ["actorSide", "version"], ACCEPTED: ["actorSide"], CHANGES: ["actorSide"], ROUND_CLASSIFIED: ["actorSide", "countsTowardLimit"],
  PAYMENT_UPDATED: ["actorSide", "status", "hasDueDate", "hasPaidDate", "hasDocument"], MATERIAL_ADDED: ["actorSide", "kind", "physicalFile"],
  NOTIFICATION_ENQUEUED: ["eventType", "channelCount"], NOTIFICATION_DISPATCHED: ["sent", "failed", "skipped"], NOTIFICATION_PREFERENCES_UPDATED: ["importantEmail"],
  PRIVACY_REQUEST_REGISTERED: ["requestNumber", "kind", "scope", "channel"], PRIVACY_REQUEST_PREPARED: ["requestNumber", "excludedCategoryCount"], PRIVACY_REQUEST_COMPLETED: ["requestNumber", "destroyedCategoryCount", "result", "storageWarnings"],
  STORAGE_CLEANUP_COMPLETED: ["files", "bytes", "preservedHistory"], ARCHIVED_BRIEFS_DELETED: ["count"], ORPHAN_STORAGE_CLEANUP_COMPLETED: ["files", "bytes"], RETENTION_SETTINGS_UPDATED: ["projectDays", "briefDays", "warningDays", "automaticCleanupEnabled"], ADMIN_NOTIFICATION_EMAIL_UPDATED: ["enabled"],
};

function primitive(value: unknown): value is string | number | boolean { return typeof value === "string" || typeof value === "number" || typeof value === "boolean"; }

export function sanitizeAuditMetadata(eventType: string, metadata?: Record<string, unknown> | null): Record<string, string | number | boolean> | undefined {
  if (!metadata) return undefined;
  const allowed = new Set(metadataAllowlist[eventType] ?? []);
  const safe = Object.fromEntries(Object.entries(metadata).filter(([key, value]) => allowed.has(key) && primitive(value)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value])) as Record<string, string | number | boolean>;
  return Object.keys(safe).length ? safe : undefined;
}

export async function appendAudit(tx: Prisma.TransactionClient, input: { eventType: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) {
  return tx.auditEvent.create({ data: { eventType: input.eventType, entityType: input.entityType, entityId: input.entityId, metadata: sanitizeAuditMetadata(input.eventType, input.metadata) } });
}

export function categoryFor(eventType: string, entityType: string): JournalCategory {
  if (eventType.startsWith("PRIVACY_") || entityType === "PERSONAL_DATA_REQUEST") return "PRIVACY";
  if (eventType.startsWith("BRIEF_") || entityType === "BriefRequest") return "BRIEFS";
  if (eventType.startsWith("CLIENT_") || entityType === "CLIENT_USER") return "CLIENTS";
  if (eventType.startsWith("PAYMENT_")) return "PAYMENTS";
  if (eventType.includes("MATERIAL") || eventType === "RESULT_PUBLISHED") return "MATERIALS";
  if (eventType.startsWith("NOTIFICATION_")) return "NOTIFICATIONS";
  if (entityType === "PROJECT" || /^(PROJECT|STAGE|ACCEPTED|CHANGES|ROUND)_/.test(eventType)) return "PROJECTS";
  return "SYSTEM";
}

export type JournalQuery = { page?: number; pageSize?: number; from?: Date; to?: Date; entityType?: string; eventType?: string; category?: JournalCategory };
export async function listJournal(query: JournalQuery, actor: { side: "ADMIN" | "CLIENT" }) {
  if (actor.side !== "ADMIN") throw new Error("Журнал доступен только администратору.");
  const page = Math.max(1, query.page ?? 1); const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 25));
  const createdAt = query.from || query.to ? { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } : undefined;
  const audits = await prisma.auditEvent.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(query.entityType ? { entityType: query.entityType } : {}), ...(query.eventType ? { eventType: query.eventType } : {}) }, orderBy: { createdAt: "desc" }, take: 5000 });
  const projectEvents = query.entityType && query.entityType !== "PROJECT" ? [] : await prisma.projectEvent.findMany({ where: { ...(createdAt ? { createdAt } : {}), ...(query.eventType ? { type: query.eventType } : {}) }, select: { id: true, type: true, projectId: true, actorSide: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5000 });
  const auditKeys = new Set(audits.map(item => `${item.entityId}:${item.eventType}:${Math.floor(item.createdAt.getTime() / 5000)}`));
  const combined = [
    ...audits.map(item => ({ id: item.id, eventType: item.eventType, entityType: item.entityType, entityId: item.entityId, category: categoryFor(item.eventType, item.entityType), metadata: sanitizeAuditMetadata(item.eventType, item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : null), createdAt: item.createdAt, source: "AUDIT" as const })),
    ...projectEvents.filter(item => !auditKeys.has(`${item.projectId}:${item.type}:${Math.floor(item.createdAt.getTime() / 5000)}`)).map(item => ({ id: item.id, eventType: item.type, entityType: "PROJECT", entityId: item.projectId, category: categoryFor(item.type, "PROJECT"), metadata: { actorSide: item.actorSide }, createdAt: item.createdAt, source: "BUSINESS" as const })),
  ].filter(item => !query.category || item.category === query.category).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const offset = (page - 1) * pageSize;
  return { items: combined.slice(offset, offset + pageSize), total: combined.length, page, pageSize, pages: Math.max(1, Math.ceil(combined.length / pageSize)) };
}

export async function clientAuditTimeline(clientId: string) {
  const hashed = createHash("sha256").update(clientId).digest("hex");
  const events = await prisma.auditEvent.findMany({ where: { entityType: "CLIENT_USER", entityId: { in: [clientId, hashed] } }, orderBy: { createdAt: "desc" }, take: 10 });
  return events.map(item => ({ ...item, metadata: sanitizeAuditMetadata(item.eventType, item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : null) }));
}
