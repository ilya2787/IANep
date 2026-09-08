import { BriefConflict, briefNumber } from "@/server/brief/brief.receipt";
import { NextResponse } from "next/server";

import { submitBriefSchema } from "@/server/brief/brief.schema";
import { briefService } from "@/server/brief/brief.service";
import { operationalError, requestId } from "@/server/operations/log";
import { BodyTooLargeError, readJsonBody } from "@/server/security/body";
import { clientIp } from "@/server/security/client-ip";
import { consumeRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
const MAX_BRIEF_BODY_BYTES = 64 * 1024;
const BRIEF_LIMIT = 20;
const BRIEF_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let body: unknown;
  const correlationId = requestId(request.headers);
  const rateLimit = consumeRateLimit("public-brief", clientIp(request.headers), { limit: BRIEF_LIMIT, windowMs: BRIEF_WINDOW_MS });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Слишком много заявок. Попробуйте позже" } },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "X-Request-Id": correlationId, "Cache-Control": "no-store" } },
    );
  }

  try {
    body = await readJsonBody(request, MAX_BRIEF_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json(
        { error: { code: "BODY_TOO_LARGE", message: "Размер заявки превышает допустимый лимит" } },
        { status: 413, headers: { "X-Request-Id": correlationId, "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Отправьте корректный JSON",
        },
      },
      { status: 400, headers: { "X-Request-Id": correlationId, "Cache-Control": "no-store" } },
    );
  }

  const validation = submitBriefSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Проверьте данные заявки",
          issues: validation.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.code === "unrecognized_keys" ? "Удалите неподдерживаемые поля" : issue.message,
          })),
        },
      },
      { status: 422, headers: { "X-Request-Id": correlationId, "Cache-Control": "no-store" } },
    );
  }

  const receipt = request.headers.get('x-brief-receipt') ?? undefined;
  const action = request.headers.get('x-brief-action') ?? undefined;
  if ((receipt && !/^[a-f0-9]{64}$/.test(receipt)) || (action && action !== 'new' && action !== 'replace')) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Некорректный выбор действия' } }, { status: 422, headers: { "X-Request-Id": correlationId, "Cache-Control": "no-store" } });
  }

  try {
    const result = await briefService.submitPublic(validation.data, { receipt, action: action as 'new' | 'replace' | undefined });
    const briefRequest = result.request;

    return NextResponse.json(
      {
        data: {
          id: briefRequest.id,
          number: briefNumber(briefRequest.number),
          receipt: result.receipt,
          replaced: result.replaced,
          status: briefRequest.status,
          createdAt: briefRequest.createdAt.toISOString(),
        },
      },
      { status: result.replaced ? 200 : 201, headers: { "Cache-Control": "no-store", "X-Request-Id": correlationId } },
    );
  } catch (error) {
    if (error instanceof BriefConflict) {
      return NextResponse.json({ error: {
        code: error.code, number: error.number, canReplace: error.canReplace,
        message: error.code === 'DUPLICATE_BRIEF' ? 'Вы уже отправляли заявку с этим контактом' : 'Предыдущую заявку уже нельзя заменить. Можно создать новую.',
      } }, { status: 409, headers: { 'Cache-Control': 'no-store', "X-Request-Id": correlationId } });
    }
    operationalError("brief.submit.failed", error, { requestId: correlationId });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Не удалось отправить заявку. Попробуйте ещё раз",
        },
      },
      { status: 500, headers: { "X-Request-Id": correlationId, "Cache-Control": "no-store" } },
    );
  }
}
