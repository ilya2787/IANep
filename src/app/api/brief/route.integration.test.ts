import { validBriefPayload } from "@/server/brief/brief.test-fixture";
import assert from "node:assert/strict";
import test from "node:test";

import { briefService } from "@/server/brief/brief.service";
import { POST } from "@/app/api/brief/route";
import { prisma } from "@/server/db/prisma";
import { resetRateLimitsForTests } from "@/server/security/rate-limit";
import { LEGAL_VERSIONS } from "@/config/legal";

test("POST /api/brief отклоняет некорректный JSON", async () => {
  const response = await POST(
    new Request("http://localhost/api/brief", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{invalid-json",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_JSON",
      message: "Отправьте корректный JSON",
    },
  });
});

test("POST /api/brief отклоняет некорректные поля", async () => {
  const response = await POST(
    new Request("http://localhost/api/brief", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "",
        contact: "",
        projectType: "",
        answers: {},
      }),
    }),
  );

  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.issues.length >= 4);
});

test("POST /api/brief отклоняет заявку без согласия", async () => {
  const payload = validBriefPayload();
  payload.answers.consent = false;
  const response = await POST(new Request("http://localhost/api/brief", { method: "POST", body: JSON.stringify(payload) }));
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.issues.some((issue: { path: string[] }) => issue.path.at(-1) === "consent"));
});

test("POST /api/brief создаёт заявку и событие аудита", async () => {
  let briefRequestId: string | undefined;

  try {
    const response = await POST(
      new Request("http://localhost/api/brief", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validBriefPayload()),
      }),
    );

    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.data.status, "NEW");
    assert.ok(body.data.id);
    assert.ok(body.data.createdAt);

    briefRequestId = body.data.id;

    const briefRequest = await prisma.briefRequest.findUniqueOrThrow({
      where: {
        id: briefRequestId,
      },
    });

    assert.equal(briefRequest.name, "Тест API");
    assert.equal(briefRequest.contact, "api@example.com");
    assert.equal(briefRequest.contactType, "EMAIL");
    assert.equal(briefRequest.projectType, "landing-page");
    assert.equal(briefRequest.source, "PUBLIC_BRIEF");
    assert.ok(briefRequest.consentAcceptedAt instanceof Date);
    assert.ok(briefRequest.consentAcceptedAt.getTime() >= new Date(body.data.createdAt).getTime() - 1_000);
    assert.equal(briefRequest.consentVersion, LEGAL_VERSIONS.briefConsent);
    assert.deepEqual(briefRequest.answers, validBriefPayload().answers);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "BriefRequest",
        entityId: briefRequestId,
      },
    });

    assert.ok(auditEvent);
    assert.equal(auditEvent.eventType, "BRIEF_CREATED");
  } finally {
    if (briefRequestId) {
      await prisma.$transaction([
        prisma.auditEvent.deleteMany({
          where: {
            entityType: "BriefRequest",
            entityId: briefRequestId,
          },
        }),
        prisma.briefRequest.delete({
          where: {
            id: briefRequestId,
          },
        }),
      ]);
    }

    await prisma.$disconnect();
  }
});

test("POST /api/brief канонизирует телефон без доверия к клиентской маске", async () => {
  let briefRequestId: string | undefined;
  try {
    const payload = validBriefPayload();
    payload.answers.contactMethod = "Телефон";
    payload.contact = "8 999 123 45 67";
    const response = await POST(new Request("http://localhost/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
    const body = await response.json();
    assert.equal(response.status, 201);
    briefRequestId = body.data.id;
    const saved = await prisma.briefRequest.findUniqueOrThrow({ where: { id: briefRequestId } });
    assert.equal(saved.contact, "+79991234567");
    assert.equal(saved.contactType, "PHONE");
  } finally {
    if (briefRequestId) await prisma.$transaction([
      prisma.auditEvent.deleteMany({ where: { entityType: "BriefRequest", entityId: briefRequestId } }),
      prisma.briefRequest.delete({ where: { id: briefRequestId } }),
    ]);
    await prisma.$disconnect();
  }
});


test("POST /api/brief отклоняет поля, назначаемые сервером", async () => {
  for (const field of ["status", "source", "eventType", "consentVersion", "consentAcceptedAt"]) {
    const response = await POST(new Request("http://localhost/api/brief", {
      method: "POST",
      body: JSON.stringify({ ...validBriefPayload(), [field]: "OVERRIDE" }),
    }));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).error.code, "VALIDATION_ERROR");
  }
});

test("POST /api/brief скрывает внутренние ошибки", async (context) => {
  context.mock.method(briefService, "submitPublic", async () => {
    throw new Error("INTERNAL_DATABASE_DETAILS");
  });
  const log = context.mock.method(console, "error", () => {});
  const response = await POST(new Request("http://localhost/api/brief", {
    method: "POST",
    body: JSON.stringify(validBriefPayload()),
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: "INTERNAL_ERROR", message: "Не удалось отправить заявку. Попробуйте ещё раз" },
  });
  assert.equal(log.mock.calls.length, 1);
  const logged = JSON.parse(String(log.mock.calls[0].arguments[0]));
  assert.equal(logged.event, "brief.submit.failed");
  assert.equal(logged.errorType, "Error");
  assert.equal(JSON.stringify(logged).includes("INTERNAL_DATABASE_DETAILS"), false);
});

test("POST /api/brief ограничивает размер тела до разбора JSON", async () => {
  resetRateLimitsForTests();
  const response = await POST(new Request("http://localhost/api/brief", {
    method: "POST",
    headers: { "content-length": String(65 * 1024) },
    body: "{}",
  }));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, "BODY_TOO_LARGE");
});

test("POST /api/brief применяет server-side rate limit", async () => {
  resetRateLimitsForTests();
  let response!: Response;
  for (let index = 0; index < 21; index += 1) {
    response = await POST(new Request("http://localhost/api/brief", { method: "POST", body: "{}" }));
  }
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, "RATE_LIMITED");
  assert.ok(Number(response.headers.get("retry-after")) >= 1);
  resetRateLimitsForTests();
});

test('повторный бриф требует выбора, замена сохраняет номер, новая заявка получает другой', async () => {
  const ids: string[] = [];
  const send = (payload: ReturnType<typeof validBriefPayload>, receipt?: string, action?: string) => POST(new Request('http://localhost/api/brief', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(receipt ? { 'x-brief-receipt': receipt } : {}), ...(action ? { 'x-brief-action': action } : {}) },
    body: JSON.stringify(payload),
  }));
  try {
    const payload = validBriefPayload();
    const firstResponse = await send(payload);
    assert.equal(firstResponse.status, 201);
    const first = (await firstResponse.json()).data;
    ids.push(first.id);
    assert.match(first.number, /^IAN-\d{6,}$/);
    assert.match(first.receipt, /^[a-f0-9]{64}$/);
    payload.contact = 'API@EXAMPLE.COM';
    payload.answers.description = 'Обновлённая заявка';
    const duplicate = await send(payload, first.receipt);
    assert.equal(duplicate.status, 409);
    assert.deepEqual((await duplicate.json()).error, { code: 'DUPLICATE_BRIEF', number: first.number, canReplace: true, message: 'Вы уже отправляли заявку с этим контактом' });
    assert.equal((await send(payload, undefined, 'replace')).status, 409);
    assert.equal((await send(payload, 'f'.repeat(64), 'replace')).status, 409);
    assert.equal((await send({ ...payload, contact: 'different@example.com' }, first.receipt, 'replace')).status, 409);
    const replacement = await send(payload, first.receipt, 'replace');
    assert.equal(replacement.status, 200);
    const updated = (await replacement.json()).data;
    assert.equal(updated.id, first.id);
    assert.equal(updated.number, first.number);
    assert.equal(updated.replaced, true);
    const record = await prisma.briefRequest.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal((record.answers as { description: string }).description, 'Обновлённая заявка');
    assert.equal(record.status, 'NEW');
    assert.ok(record.consentAcceptedAt instanceof Date);
    assert.equal(record.consentVersion, LEGAL_VERSIONS.briefConsent);
    const audits = await prisma.auditEvent.findMany({ where: { entityId: first.id }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(audits.map((event) => event.eventType), ['BRIEF_CREATED', 'BRIEF_UPDATED']);
    assert.ok(!JSON.stringify(audits).includes(first.receipt));
    assert.deepEqual(audits[1].metadata, { source: 'PUBLIC_BRIEF' });
    const newResponse = await send(payload, first.receipt, 'new');
    assert.equal(newResponse.status, 201);
    const second = (await newResponse.json()).data;
    ids.push(second.id);
    assert.notEqual(second.id, first.id);
    assert.notEqual(second.number, first.number);
    await prisma.briefRequest.update({ where: { id: first.id }, data: { status: 'IN_REVIEW' } });
    const locked = await send(payload, first.receipt);
    assert.equal((await locked.json()).error.canReplace, false);
    assert.equal((await send(payload, first.receipt, 'replace')).status, 409);
  } finally {
    await prisma.$transaction([
      prisma.auditEvent.deleteMany({ where: { entityType: 'BriefRequest', entityId: { in: ids } } }),
      prisma.briefRequest.deleteMany({ where: { id: { in: ids } } }),
    ]);
    await prisma.$disconnect();
  }
});
