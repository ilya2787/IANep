import { createHash, randomUUID } from "node:crypto";
import { lstat, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";
import { storagePath } from "@/server/storage/files";
import { getSystemSettings } from "@/server/system/settings";
import { WorkspaceError } from "@/server/client/service";
import { appendAudit } from "@/server/security/audit-journal";

export type CleanupCandidate = { id: string; title: string; archivedAt: Date; deleteAfter: Date | null; files: number; bytes: number };
export type ArchivedBriefCandidate = { id: string; number: number; name: string; archivedAt: Date | null; deleteAfter: Date | null };
export type CandidatePage<T> = { items: T[]; page: number; pages: number; total: number };

export const CLEANUP_CANDIDATES_PAGE_SIZE = 10;

function storageRoot() {
  return path.dirname(storagePath(randomUUID()));
}

export async function cleanupCandidates(now = new Date()): Promise<CleanupCandidate[]> {
  const settings = await getSystemSettings();
  const retentionCutoff = new Date(now.getTime() - settings.archivedProjectRetentionDays * 86_400_000);
  const projects = await prisma.clientProject.findMany({
    where: { archivedAt: { not: null }, OR: [{ deleteAfter: { lte: now } }, { deleteAfter: null, archivedAt: { lte: retentionCutoff } }] },
    select: { id: true, title: true, archivedAt: true, deleteAfter: true, files: { where: { physicalDeletedAt: null }, select: { id: true, size: true } } },
    orderBy: { archivedAt: "asc" },
  });
  const entries = new Set(await readdir(storageRoot()).catch(() => [] as string[]));
  const candidates = await Promise.all(projects.map(async project => {
    const existingFiles = (await Promise.all(project.files.map(async file => {
      if (!entries.has(file.id)) return null;
      const info = await stat(storagePath(file.id)).catch(() => null);
      return info?.isFile() ? file : null;
    }))).filter((file): file is { id: string; size: number } => file !== null);
    return { id: project.id, title: project.title, archivedAt: project.archivedAt!, deleteAfter: project.deleteAfter, files: existingFiles.length, bytes: existingFiles.reduce((sum, file) => sum + file.size, 0) };
  }));
  return candidates;
}

function candidatePage<T>(items: T[], requestedPage: number, pageSize = CLEANUP_CANDIDATES_PAGE_SIZE): CandidatePage<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1), pages);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pages, total };
}

export async function storageSummary(projectPage = 1, briefPage = 1) {
  const [settings, aggregate, activeProjects, archivedProjects, materialCount, candidates, entries, briefCandidates] = await Promise.all([
    getSystemSettings(),
    prisma.storedFile.aggregate({ where: { physicalDeletedAt: null }, _sum: { size: true }, _count: true }),
    prisma.clientProject.count({ where: { archivedAt: null } }),
    prisma.clientProject.count({ where: { archivedAt: { not: null } } }),
    prisma.versionMaterial.count(),
    cleanupCandidates(),
    readdir(storageRoot()).catch(() => [] as string[]),
    archivedBriefCandidatePage(briefPage),
  ]);
  const known = new Set((await prisma.storedFile.findMany({ where: { physicalDeletedAt: null }, select: { id: true } })).map(file => file.id));
  let orphanFiles = 0;
  let orphanBytes = 0;
  for (const entry of entries) {
    if (!/^[0-9a-f-]{36}(?:\.deleting-[0-9a-f-]{36})?$/.test(entry)) continue;
    const id = entry.slice(0, 36);
    if (!known.has(id) || entry.includes(".deleting-")) {
      const info = await stat(path.join(storageRoot(), entry)).catch(() => null);
      if (info?.isFile()) { orphanFiles++; orphanBytes += info.size; }
    }
  }
  return { settings, totalFiles: aggregate._count, totalBytes: aggregate._sum.size ?? 0, activeProjects, archivedProjects, materialCount, candidates: candidatePage(candidates, projectPage), briefCandidates, candidateFiles: candidates.reduce((sum, item) => sum + item.files, 0), candidateBytes: candidates.reduce((sum, item) => sum + item.bytes, 0), orphanFiles, orphanBytes };
}

export async function archivedBriefCandidates(now = new Date()) {
  const settings = await getSystemSettings();
  const cutoff = new Date(now.getTime() - settings.archivedBriefRetentionDays * 86_400_000);
  return prisma.briefRequest.findMany({ where: { status: "ARCHIVED", project: null, OR: [{ deleteAfter: { lte: now } }, { deleteAfter: null, archivedAt: { lte: cutoff } }] }, select: { id: true, number: true, name: true, archivedAt: true, deleteAfter: true }, orderBy: { archivedAt: "asc" } });
}

export async function archivedBriefCandidatePage(requestedPage: number, now = new Date()): Promise<CandidatePage<ArchivedBriefCandidate>> {
  const settings = await getSystemSettings();
  const cutoff = new Date(now.getTime() - settings.archivedBriefRetentionDays * 86_400_000);
  const where = { status: "ARCHIVED" as const, project: null, OR: [{ deleteAfter: { lte: now } }, { deleteAfter: null, archivedAt: { lte: cutoff } }] };
  const total = await prisma.briefRequest.count({ where });
  const pages = Math.max(1, Math.ceil(total / CLEANUP_CANDIDATES_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1), pages);
  const items = await prisma.briefRequest.findMany({ where, select: { id: true, number: true, name: true, archivedAt: true, deleteAfter: true }, orderBy: { archivedAt: "asc" }, skip: (page - 1) * CLEANUP_CANDIDATES_PAGE_SIZE, take: CLEANUP_CANDIDATES_PAGE_SIZE });
  return { items, page, pages, total };
}

type Quarantined = { source: string; quarantine: string };

function containsIdentifier(value: unknown, ids: Set<string>): boolean {
  if (typeof value === "string") return ids.has(value);
  if (Array.isArray(value)) return value.some(item => containsIdentifier(item, ids));
  return Boolean(value && typeof value === "object" && Object.values(value).some(item => containsIdentifier(item, ids)));
}

async function purgeOneArchivedProject(projectId: string, now: Date) {
  const stale = () => new WorkspaceError("Состав кандидатов изменился. Обновите предварительный просмотр.");
  const settings = await getSystemSettings();
  const cutoff = new Date(now.getTime() - settings.archivedProjectRetentionDays * 86_400_000);
  const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { clientId: true, briefId: true, archivedAt: true, deleteAfter: true } });
  if (!project?.archivedAt || (project.deleteAfter ? project.deleteAfter > now : project.archivedAt > cutoff)) throw stale();
  const files = await prisma.storedFile.findMany({ where: { projectId }, select: { id: true, size: true }, orderBy: { id: "asc" } });
  const moved: Quarantined[] = [];
  try {
    for (const file of files) {
      const source = storagePath(file.id);
      const quarantine = `${source}.deleting-${randomUUID()}`;
      const info = await lstat(source).catch(error => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      });
      if (info && !info.isFile()) throw new WorkspaceError("Файл проекта имеет неожиданный тип. Удаление остановлено.");
      try { await rename(source, quarantine); moved.push({ source, quarantine }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    const result = await prisma.$transaction(async tx => {
      // The row lock serializes the final eligibility check with archive/restore updates.
      const locked = await tx.$queryRaw<Array<{ id: string; client_id: string; brief_id: string | null; archived_at: Date | null; delete_after: Date | null }>>`
        SELECT id, "clientId" AS client_id, "briefId" AS brief_id, "archivedAt" AS archived_at, "deleteAfter" AS delete_after FROM client_projects WHERE id = ${projectId}::uuid FOR UPDATE
      `;
      const current = locked[0];
      if (!current || !current.archived_at || current.client_id !== project.clientId || current.brief_id !== project.briefId ||
          (current.delete_after ? current.delete_after > now : current.archived_at > cutoff)) throw stale();
      const currentFiles = await tx.storedFile.findMany({ where: { projectId }, select: { id: true } });
      if (currentFiles.length !== files.length || currentFiles.some(file => !files.some(original => original.id === file.id))) throw stale();
      const pendingPrivacy = await tx.personalDataRequest.count({ where: { targetId: { in: [projectId, ...(project.briefId ? [project.briefId] : [])] } } });
      if (pendingPrivacy) throw new WorkspaceError("Есть обращение о персональных данных по проекту. Удаление остановлено.");
      await tx.notification.deleteMany({ where: { projectId } });
      await tx.stageDecision.deleteMany({ where: { version: { stage: { projectId } } } });
      await tx.versionMaterial.deleteMany({ where: { version: { stage: { projectId } } } });
      await tx.projectMaterial.deleteMany({ where: { projectId } });
      await tx.stageVersion.deleteMany({ where: { stage: { projectId } } });
      await tx.projectStage.deleteMany({ where: { projectId } });
      await tx.projectPayment.deleteMany({ where: { projectId } });
      await tx.projectEvent.deleteMany({ where: { projectId } });
      await tx.storedFile.deleteMany({ where: { projectId } });
      const deleted = await tx.clientProject.deleteMany({ where: { id: projectId, clientId: project.clientId, archivedAt: { not: null } } });
      if (deleted.count !== 1) throw stale();
      if (project.briefId) await tx.briefRequest.delete({ where: { id: project.briefId } });
      const remaining = await tx.clientProject.count({ where: { clientId: project.clientId } });
      const pendingClientPrivacy = await tx.personalDataRequest.count({ where: { targetId: project.clientId } });
      let accountDeleted = false;
      if (!remaining && !pendingClientPrivacy) {
        if (await tx.stageDecision.count({ where: { clientId: project.clientId } })) throw stale();
        await tx.notification.deleteMany({ where: { recipientClientId: project.clientId } });
        await tx.clientUser.delete({ where: { id: project.clientId } });
        accountDeleted = true;
      }
      const rawIds = [projectId, ...(project.briefId ? [project.briefId] : []), ...(accountDeleted ? [project.clientId] : [])];
      const identifiers = new Set(rawIds.flatMap(id => [id, createHash("sha256").update(id).digest("hex")]));
      const audits = await tx.auditEvent.findMany({ where: { NOT: { entityType: "PERSONAL_DATA_REQUEST" } }, select: { id: true, entityId: true, metadata: true } });
      const auditIds = audits.filter(item => identifiers.has(item.entityId) || containsIdentifier(item.metadata, identifiers)).map(item => item.id);
      if (auditIds.length) await tx.auditEvent.deleteMany({ where: { id: { in: auditIds } } });
      const bytes = files.reduce((sum, file) => sum + file.size, 0);
      await appendAudit(tx, { eventType: "ARCHIVED_PROJECT_PURGED", entityType: "SYSTEM", entityId: "project-retention", metadata: { projects: 1, files: files.length, bytes, accounts: Number(accountDeleted) } });
      return { projects: 1, files: files.length, bytes, accounts: Number(accountDeleted) };
    }, { timeout: 30_000 });
    let warnings = 0;
    for (const file of moved) try { await unlink(file.quarantine); } catch { warnings++; }
    return { ...result, warnings };
  } catch (error) {
    for (const file of moved.reverse()) await rename(file.quarantine, file.source).catch(() => undefined);
    throw error;
  }
}

export async function purgeArchivedProjects(projectIds: string[], adminId: string, now = new Date()) {
  if (!projectIds.length || new Set(projectIds).size !== projectIds.length) throw new WorkspaceError("Выберите проекты для удаления.");
  void adminId;
  const totals = { projects: 0, files: 0, bytes: 0, accounts: 0, warnings: 0 };
  for (const id of projectIds) {
    const result = await purgeOneArchivedProject(id, now);
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += result[key];
  }
  return totals;
}

export async function deleteArchivedBriefs(ids: string[], adminId: string) {
  void adminId;
  const allowed = new Set((await archivedBriefCandidates()).map(brief => brief.id));
  if (!ids.length || ids.some(id => !allowed.has(id))) throw new WorkspaceError("Состав заявок изменился. Обновите предварительный просмотр.");
  return prisma.$transaction(async tx => {
    const linked = await tx.briefRequest.count({ where: { id: { in: ids }, project: { isNot: null } } });
    if (linked) throw new WorkspaceError("Связанную с проектом заявку удалить нельзя.");
    await appendAudit(tx, { eventType: "ARCHIVED_BRIEFS_DELETED", entityType: "SYSTEM", entityId: "brief-retention", metadata: { count: ids.length } });
    await tx.auditEvent.deleteMany({ where: { entityType: "BriefRequest", entityId: { in: ids } } });
    return tx.briefRequest.deleteMany({ where: { id: { in: ids }, status: "ARCHIVED", project: null } });
  });
}

export async function cleanOrphanFiles(adminId: string) {
  const root = storageRoot();
  const cutoff = Date.now() - 86_400_000;
  const known = new Set((await prisma.storedFile.findMany({ where: { physicalDeletedAt: null }, select: { id: true } })).map(file => file.id));
  const candidates: { path: string; size: number }[] = [];
  for (const entry of await readdir(root).catch(() => [] as string[])) {
    if (!/^[0-9a-f-]{36}(?:\.deleting-[0-9a-f-]{36})?$/.test(entry)) continue;
    const info = await stat(path.join(root, entry)).catch(() => null);
    if (!info?.isFile() || info.mtimeMs > cutoff) continue;
    const id = entry.slice(0, 36);
    if (!known.has(id) || entry.includes(".deleting-")) candidates.push({ path: path.join(root, entry), size: info.size });
  }
  for (const candidate of candidates) await unlink(candidate.path);
  await appendAudit(prisma, { eventType: "ORPHAN_STORAGE_CLEANUP_COMPLETED", entityType: "SYSTEM", entityId: "storage", metadata: { files: candidates.length, bytes: candidates.reduce((sum, file) => sum + file.size, 0) } });
  void adminId;
  return { files: candidates.length, bytes: candidates.reduce((sum, file) => sum + file.size, 0) };
}
