import { fileActor } from "@/server/storage/session";
import { fileBytes, readableFile } from "@/server/storage/files";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await fileActor();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'", "Cross-Origin-Resource-Policy": "same-origin" };
  if (!actor) return new Response("Войдите в кабинет для доступа к файлу.", { status: 401, headers });
  const file = await readableFile((await params).id, actor);
  if (!file) return new Response("Файл не найден или недоступен.", { status: 404, headers });
  try {
    const bytes = await fileBytes(file);
    const inline = file.kind === "IMAGE" && !new URL(request.url).searchParams.has("download");
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": file.mimeType, "Content-Length": String(file.size), "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="file"; filename*=UTF-8''${encodeURIComponent(file.originalName).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16))}` } });
  } catch { return new Response("Файл временно недоступен. Обратитесь к IANep.", { status: 503, headers }); }
}
