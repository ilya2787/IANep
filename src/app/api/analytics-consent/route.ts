import { NextResponse } from "next/server";
import { ANALYTICS_CONSENT_VERSION } from "@/config/analytics-consent";
import { recordAnalyticsChoice, type AnalyticsConsentChoice } from "@/server/privacy/analytics-consent";
import { BodyTooLargeError, readJsonBody } from "@/server/security/body";
import { clientIp } from "@/server/security/client-ip";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { operationalError, requestId } from "@/server/operations/log";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const correlationId = requestId(request.headers);
  const origin = request.headers.get("origin");
  const canonicalOrigin = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : null;
  if (!origin || (origin !== new URL(request.url).origin && origin !== canonicalOrigin) || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Запрос запрещён" }, { status: 403, headers: noStore });
  }
  let body: unknown;
  try { body = await readJsonBody(request, 256); }
  catch (error) { return NextResponse.json({ error: "Некорректный запрос" }, { status: error instanceof BodyTooLargeError ? 413 : 400, headers: noStore }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Некорректный выбор" }, { status: 422, headers: noStore });
  const value = body as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !== "choice,version,visitorId" || typeof value.visitorId !== "string" || !UUID.test(value.visitorId) || !["allowed", "necessary", "revoked"].includes(String(value.choice))) {
    return NextResponse.json({ error: "Некорректный выбор" }, { status: 422, headers: noStore });
  }
  if (value.version !== ANALYTICS_CONSENT_VERSION) return NextResponse.json({ error: "Редакция изменилась. Обновите страницу." }, { status: 409, headers: noStore });
  const visitorLimit = consumeRateLimit("analytics-consent-visitor", value.visitorId, { limit: 30, windowMs: 60 * 60 * 1000 });
  const peer = clientIp(request.headers);
  const peerLimit = consumeRateLimit("analytics-consent-peer", peer, { limit: peer === "untrusted-peer" ? 10_000 : 300, windowMs: 60 * 60 * 1000 });
  if (!visitorLimit.allowed || !peerLimit.allowed) {
    const retry = Math.max(visitorLimit.retryAfterSeconds, peerLimit.retryAfterSeconds);
    return NextResponse.json({ error: "Слишком много запросов. Повторите позже." }, { status: 429, headers: { ...noStore, "Retry-After": String(retry) } });
  }
  try {
    const receipt = await recordAnalyticsChoice(value.visitorId, value.choice as AnalyticsConsentChoice);
    return NextResponse.json({ data: receipt }, { status: 201, headers: noStore });
  } catch (error) {
    operationalError("analytics.consent.failed", error, { requestId: correlationId });
    return NextResponse.json({ error: "Не удалось сохранить выбор. Повторите позже." }, { status: 503, headers: noStore });
  }
}
