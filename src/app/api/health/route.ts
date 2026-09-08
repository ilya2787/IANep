import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { operationalError, requestId } from "@/server/operations/log";
import { checkReadiness } from "@/server/operations/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = requestId(request.headers);
  const { ready, checks, firstFailure } = await checkReadiness(() => prisma.$queryRaw`SELECT 1`);
  if (!ready) operationalError("health.readiness.failed", firstFailure, { requestId: correlationId, database: checks.database, storage: checks.storage });
  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", checks },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Request-Id": correlationId } },
  );
}
