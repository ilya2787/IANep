import { BriefConflict, briefNumber } from "@/server/brief/brief.receipt";
import { NextResponse } from "next/server";

import { submitBriefSchema } from "@/server/brief/brief.schema";
import { briefService } from "@/server/brief/brief.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Отправьте корректный JSON",
        },
      },
      { status: 400 },
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
      { status: 422 },
    );
  }

  const receipt = request.headers.get('x-brief-receipt') ?? undefined;
  const action = request.headers.get('x-brief-action') ?? undefined;
  if ((receipt && !/^[a-f0-9]{64}$/.test(receipt)) || (action && action !== 'new' && action !== 'replace')) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Некорректный выбор действия' } }, { status: 422 });
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
      { status: result.replaced ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BriefConflict) {
      return NextResponse.json({ error: {
        code: error.code, number: error.number, canReplace: error.canReplace,
        message: error.code === 'DUPLICATE_BRIEF' ? 'Вы уже отправляли заявку с этим контактом' : 'Предыдущую заявку уже нельзя заменить. Можно создать новую.',
      } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error("Не удалось сохранить заявку");

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Не удалось отправить заявку. Попробуйте ещё раз",
        },
      },
      { status: 500 },
    );
  }
}
