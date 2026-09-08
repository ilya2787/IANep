import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";
import { withProject, type Actor, WorkspaceError } from "@/server/client/service";
import { idSchema } from "@/server/client/model";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const PROJECT_QUOTA = 1024 * 1024 * 1024;
export function storagePath(id: string) {
  idSchema.parse(id);
  const root = path.resolve(/* turbopackIgnore: true */ process.env.IANEP_STORAGE_DIR || path.join(process.cwd(), ".ianep-storage"));
  const publicRoot = path.resolve(process.cwd(), "public");
  if (root === publicRoot || root.startsWith(publicRoot + path.sep)) throw new WorkspaceError("Хранилище не должно находиться в публичной папке.");
  return path.join(root, id);
}
export function inspectFile(name: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new WorkspaceError("Файл должен быть непустым и не больше 20 МБ.");
  const extension = path.extname(name).toLowerCase();
  const starts = (hex: string) => bytes.subarray(0, hex.length / 2).toString("hex") === hex;
  if (extension === ".png" && starts("89504e470d0a1a0a")) return { mimeType: "image/png", kind: "IMAGE" as const };
  if ([".jpg", ".jpeg"].includes(extension) && starts("ffd8ff")) return { mimeType: "image/jpeg", kind: "IMAGE" as const };
  if (extension === ".webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return { mimeType: "image/webp", kind: "IMAGE" as const };
  if (extension === ".pdf" && bytes.toString("ascii", 0, 5) === "%PDF-") return { mimeType: "application/pdf", kind: "DOCUMENT" as const };
  if ([".zip", ".docx", ".xlsx", ".pptx"].includes(extension) && (starts("504b0304") || starts("504b0506"))) return { mimeType: "application/octet-stream", kind: "FILE" as const };
  if ([".txt", ".csv"].includes(extension) && !bytes.includes(0)) {
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new WorkspaceError("Текстовый файл должен быть в кодировке UTF-8."); }
    return { mimeType: "application/octet-stream", kind: "FILE" as const };
  }
  throw new WorkspaceError("Поддерживаются PNG, JPEG, WebP, PDF, ZIP, DOCX, XLSX, PPTX, TXT и CSV. Формат файла должен соответствовать расширению.");
}
export async function saveUpload(projectId: string, actor: Actor, originalName: string, stream: ReadableStream<Uint8Array>) {
  idSchema.parse(projectId);
  const name = originalName.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!name || name.length > 200) throw new WorkspaceError("Укажите имя файла длиной до 200 символов.");
  const project = await prisma.clientProject.findFirst({ where: { id: projectId, ...(actor.side === "CLIENT" ? { clientId: actor.id } : {}) }, select: { id: true } });
  if (!project) throw new WorkspaceError("Проект недоступен.");
  const reader = stream.getReader(); const chunks: Buffer[] = []; let size = 0;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 60000);
  try {
    while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); throw new WorkspaceError("Максимальный размер файла — 20 МБ."); }
      chunks.push(Buffer.from(item.value));
    }
    if (timedOut) throw new WorkspaceError("Загрузка заняла слишком много времени. Попробуйте снова.");
  } finally { clearTimeout(timeout); reader.releaseLock(); }
  const bytes = Buffer.concat(chunks); const format = inspectFile(name, bytes);
  const id = randomUUID(); const target = storagePath(id);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const handle = await open(/* turbopackIgnore: true */ target, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { await handle.close(); await unlink(/* turbopackIgnore: true */ target).catch(() => {}); throw error; }
  await handle.close();
  try {
    return await withProject(projectId, actor, async tx => {
      const used = await tx.storedFile.aggregate({ where: { projectId }, _sum: { size: true } });
      if ((used._sum.size ?? 0) + size > PROJECT_QUOTA) throw new WorkspaceError("Достигнут лимит хранилища проекта — 1 ГБ. Обратитесь к IANep.");
      return tx.storedFile.create({ data: { id, projectId, originalName: name, size, sha256: createHash("sha256").update(bytes).digest("hex"), ...format, authorId: actor.id, authorSide: actor.side } });
    });
  } catch (error) { await unlink(/* turbopackIgnore: true */ target).catch(() => {}); throw error; }
}
export async function readableFile(id: string, actor: Actor) {
  if (!idSchema.safeParse(id).success) return null;
  return prisma.storedFile.findFirst({ where: { id, physicalDeletedAt: null, ...(actor.side === "CLIENT" ? {
    project: { clientId: actor.id }, OR: [{ authorId: actor.id, authorSide: "CLIENT" }, { versions: { some: {} } }, { materials: { some: {} } }],
  } : {}) } });
}
export async function fileBytes(file: { id: string; size: number; sha256: string }) {
  const bytes = await readFile(/* turbopackIgnore: true */ storagePath(file.id));
  if (bytes.length !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new WorkspaceError("Не удалось проверить целостность файла.");
  return bytes;
}
