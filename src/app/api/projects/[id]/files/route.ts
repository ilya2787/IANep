import { fileActor } from "@/server/storage/session";
import { MAX_FILE_BYTES, saveUpload } from "@/server/storage/files";
import { WorkspaceError } from "@/server/client/service";
import { idSchema } from "@/server/client/model";
const uploads = new Map<string, number>();
let total = 0;
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
  if (!origin || (origin !== url.origin && !allowedOrigins.has(origin))) return Response.json({ error: "Запрос с другого сайта запрещён." }, { status: 403 });
  const side = url.searchParams.get("side");
  if (side !== "ADMIN" && side !== "CLIENT") return Response.json({ error: "Укажите сторону загрузки." }, { status: 400 });
  const actor = await fileActor(side);
  if (!actor) return Response.json({ error: "Войдите в кабинет, чтобы загрузить файл." }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success || !request.body) return Response.json({ error: "Некорректный запрос." }, { status: 400 });
  if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES) return Response.json({ error: "Максимальный размер файла — 20 МБ." }, { status: 413 });
  if (total >= 4 || (uploads.get(actor.id) ?? 0) >= 2) return Response.json({ error: "Уже загружаются файлы. Попробуйте через минуту." }, { status: 429 });
  total++; uploads.set(actor.id, (uploads.get(actor.id) ?? 0) + 1);
  try {
    const file = await saveUpload(id, actor, url.searchParams.get("name") || "", request.body);
    return Response.json({ id: file.id, name: file.originalName, kind: file.kind, size: file.size }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof WorkspaceError ? error.message : "Не удалось загрузить файл. Попробуйте снова." }, { status: error instanceof WorkspaceError ? 400 : 500 });
  } finally { total--; const count = (uploads.get(actor.id) ?? 1) - 1; if (count) uploads.set(actor.id, count); else uploads.delete(actor.id); }
}
