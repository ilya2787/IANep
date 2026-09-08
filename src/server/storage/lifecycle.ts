import { randomUUID } from "node:crypto";
import { readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";
import { storagePath } from "@/server/storage/files";
import { getSystemSettings } from "@/server/system/settings";
import { WorkspaceError } from "@/server/client/service";

export type CleanupCandidate = { id: string; title: string; archivedAt: Date; deleteAfter: Date | null; files: number; bytes: number };

function storageRoot() {
  return path.dirname(storagePath(randomUUID()));
}

export async function cleanupCandidates(now = new Date()): Promise<CleanupCandidate[]> {
  const settings = await getSystemSettings();
  const retentionCutoff = new Date(now.getTime() - settings.archivedProjectRetentionDays * 86_400_000);
  const projects = await prisma.clientProject.findMany({
    where: { archivedAt: { not: null }, OR: [{ deleteAfter: { lte: now } }, { deleteAfter: null, archivedAt: { lte: retentionCutoff } }] },
    select: { id: true, title: true, archivedAt: true, deleteAfter: true, files: { where: { physicalDeletedAt: null }, select: { size: true } } },
    orderBy: { archivedAt: "asc" },
  });
  return projects.map(project => ({ id: project.id, title: project.title, archivedAt: project.archivedAt!, deleteAfter: project.deleteAfter, files: project.files.length, bytes: project.files.reduce((sum, file) => sum + file.size, 0) }));
}

export async function storageSummary() {
  const [settings, aggregate, activeProjects, archivedProjects, materialCount, candidates, entries, briefCandidates] = await Promise.all([
    getSystemSettings(),
    prisma.storedFile.aggregate({ where: { physicalDeletedAt: null }, _sum: { size: true }, _count: true }),
    prisma.clientProject.count({ where: { archivedAt: null } }),
    prisma.clientProject.count({ where: { archivedAt: { not: null } } }),
    prisma.versionMaterial.count(),
    cleanupCandidates(),
    readdir(storageRoot()).catch(() => [] as string[]),
    archivedBriefCandidates(),
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
  return { settings, totalFiles: aggregate._count, totalBytes: aggregate._sum.size ?? 0, activeProjects, archivedProjects, materialCount, candidates, briefCandidates, candidateFiles: candidates.reduce((sum, item) => sum + item.files, 0), candidateBytes: candidates.reduce((sum, item) => sum + item.bytes, 0), orphanFiles, orphanBytes };
}

export async function archivedBriefCandidates(now = new Date()) {
  const settings = await getSystemSettings();
  const cutoff = new Date(now.getTime() - settings.archivedBriefRetentionDays * 86_400_000);
  return prisma.briefRequest.findMany({ where: { status: "ARCHIVED", project: null, OR: [{ deleteAfter: { lte: now } }, { deleteAfter: null, archivedAt: { lte: cutoff } }] }, select: { id: true, number: true, name: true, archivedAt: true, deleteAfter: true }, orderBy: { archivedAt: "asc" } });
}

async function retireFile(file: { id: string; projectId: string }) {
  const source = storagePath(file.id);
  const quarantine = `${source}.deleting-${randomUUID()}`;
  try { await rename(source, quarantine); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await prisma.storedFile.updateMany({ where: { id: file.id, physicalDeletedAt: null }, data: { physicalDeletedAt: new Date(), deletionReason: "MISSING_ON_DISK" } });
      return;
    }
    throw error;
  }
  try {
    await prisma.storedFile.updateMany({ where: { id: file.id, projectId: file.projectId, physicalDeletedAt: null }, data: { physicalDeletedAt: new Date(), deletionReason: "ARCHIVED_PROJECT_RETENTION" } });
  } catch (error) {
    await rename(quarantine, source).catch(() => undefined);
    throw error;
  }
  await unlink(quarantine).catch(() => undefined);
}

export async function cleanArchivedProjectFiles(projectIds: string[], adminId: string) {
  const allowed = new Set((await cleanupCandidates()).map(project => project.id));
  if (!projectIds.length || projectIds.some(id => !allowed.has(id))) throw new WorkspaceError("Состав кандидатов изменился. Обновите предварительный просмотр.");
  const files = await prisma.storedFile.findMany({ where: { projectId: { in: projectIds }, physicalDeletedAt: null }, select: { id: true, projectId: true, size: true } });
  for (const file of files) await retireFile(file);
  await prisma.auditEvent.create({ data: { eventType: "STORAGE_CLEANUP_COMPLETED", entityType: "SYSTEM", entityId: "storage", metadata: { adminId, projectIds, files: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0), preservedHistory: true } } });
  return { files: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0) };
}

export async function deleteArchivedBriefs(ids: string[], adminId: string) {
  const allowed = new Set((await archivedBriefCandidates()).map(brief => brief.id));
  if (!ids.length || ids.some(id => !allowed.has(id))) throw new WorkspaceError("Состав заявок изменился. Обновите предварительный просмотр.");
  return prisma.$transaction(async tx => {
    const linked = await tx.briefRequest.count({ where: { id: { in: ids }, project: { isNot: null } } });
    if (linked) throw new WorkspaceError("Связанную с проектом заявку удалить нельзя.");
    await tx.auditEvent.create({ data: { eventType: "ARCHIVED_BRIEFS_DELETED", entityType: "SYSTEM", entityId: "brief-retention", metadata: { adminId, ids, count: ids.length } } });
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
  await prisma.auditEvent.create({ data: { eventType: "ORPHAN_STORAGE_CLEANUP_COMPLETED", entityType: "SYSTEM", entityId: "storage", metadata: { adminId, files: candidates.length, bytes: candidates.reduce((sum, file) => sum + file.size, 0) } } });
  return { files: candidates.length, bytes: candidates.reduce((sum, file) => sum + file.size, 0) };
}
