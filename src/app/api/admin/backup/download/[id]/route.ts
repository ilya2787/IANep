import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { getAdminSession } from "@/server/auth/admin-auth";
import { authorizedDownload, ROOT, DOWNLOAD_HEADERS } from "@/server/backup/core";
import { securityAudit } from "@/server/security/audit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  const item = await authorizedDownload(ROOT, (await context.params).id, session);
  if (!item) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const source = createReadStream(item.path);
  source.once("close", () => { void rm(item.dir, { recursive: true, force: true }); });
  await securityAudit("BACKUP_DOWNLOADED", "BACKUP", (await context.params).id, { mode: "download" });
  return new Response(Readable.toWeb(source) as ReadableStream, { headers: { ...DOWNLOAD_HEADERS, "Content-Length": String(item.size) } });
}
