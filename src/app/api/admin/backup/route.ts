import { spawn } from "node:child_process";
import { getAdminSession } from "@/server/auth/admin-auth";
import { backupAvailable, claim, readStatus, ROOT, successfulSets, latestSuccessfulDetails, readyDownload, parseMode } from "@/server/backup/core";
import { securityAudit } from "@/server/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const forbidden = () => Response.json({ message: "Доступ запрещён." }, { status: 403, headers });
export async function GET() {
  const session = await getAdminSession(); if (!session) return forbidden();
  if (!(await backupAvailable())) return Response.json({ available: false, status: null, latestSuccessful: null, serverSets: 0, availableDownloadId: null }, { headers });
  const [status, sets, latestSuccessful, availableDownloadId] = await Promise.all([readStatus(), successfulSets(), latestSuccessfulDetails(), readyDownload(ROOT, session)]);
  const visible = status && (status.mode === "server" || status.ownerId === session.adminId && status.sessionVersion === session.sessionVersion) ? status : null;
  return Response.json({ available: true, status: visible, latestSuccessful, serverSets: sets.length, availableDownloadId }, { headers });
}
export async function POST(request: Request) {
  const session = await getAdminSession(); if (!session) return forbidden();
  if (!(await backupAvailable())) return Response.json({ message: "Резервное копирование не настроено в этом окружении." }, { status: 503, headers });
  const origin = request.headers.get("origin"); const expected = process.env.APP_BASE_URL;
  if (!origin || !expected || origin !== new URL(expected).origin) return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || Object.keys(body).length !== 1 || (body.mode !== "server" && body.mode !== "download")) return Response.json({ message: "Некорректный способ создания копии." }, { status: 400, headers });
  const mode = parseMode(body.mode)!;
  try {
    const status = await claim(ROOT, mode, session.adminId, session.sessionVersion);
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/backup.ts", "worker", mode, status.id], { cwd: process.cwd(), env: process.env, stdio: "ignore", detached: true });
    child.unref();
    await securityAudit("BACKUP_STARTED", "BACKUP", status.id, { mode, source: "admin" });
    return Response.json({ id: status.id }, { status: 202, headers });
  } catch (error) { return Response.json({ message: error instanceof Error && error.message === "BACKUP_BUSY" ? "Резервная копия уже создаётся." : "Не удалось начать создание копии." }, { status: 409, headers }); }
}
