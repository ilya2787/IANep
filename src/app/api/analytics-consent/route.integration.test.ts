import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@/server/db/prisma";
import { ANALYTICS_CONSENT_VERSION } from "@/config/analytics-consent";
import { cleanupExpiredAnalyticsConsent, consentExpiry } from "@/server/privacy/analytics-consent";
import { POST } from "./route";

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/analytics-consent", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

test("журнал выбора сохраняет разрешение, отказ и отзыв без IP и user-agent", async () => {
  const visitorId = randomUUID();
  try {
    for (const choice of ["allowed", "necessary", "revoked"]) {
      const response = await POST(request({ visitorId, choice, version: ANALYTICS_CONSENT_VERSION }));
      assert.equal(response.status, 201);
    }
    const events = await prisma.analyticsConsentEvent.findMany({ where: { visitorId }, orderBy: { occurredAt: "asc" } });
    assert.equal(events.length, 3);
    assert.deepEqual(events.map(event => event.choice), ["allowed", "necessary", "revoked"]);
    assert.ok(events.every(event => event.policyVersion === ANALYTICS_CONSENT_VERSION));
    assert.ok(events.every(event => event.expiresAt.getTime() > event.occurredAt.getTime()));
    assert.deepEqual(Object.keys(events[0]).sort(), ["choice", "expiresAt", "id", "occurredAt", "policyVersion", "visitorId"].sort());
  } finally { await prisma.analyticsConsentEvent.deleteMany({ where: { visitorId } }); }
});

test("журнал отклоняет другой origin и неверную версию", async () => {
  const visitorId = randomUUID();
  assert.equal((await POST(request({ visitorId, choice: "allowed", version: ANALYTICS_CONSENT_VERSION }, "https://elsewhere.example"))).status, 403);
  assert.equal((await POST(request({ visitorId, choice: "allowed", version: "old" }))).status, 409);
  assert.equal(await prisma.analyticsConsentEvent.count({ where: { visitorId } }), 0);
});

test("истёкшая запись удаляется, свежая сохраняется", async () => {
  const visitorId = randomUUID();
  try {
    await prisma.analyticsConsentEvent.create({ data: { visitorId, choice: "allowed", policyVersion: ANALYTICS_CONSENT_VERSION, expiresAt: new Date("2020-01-01") } });
    await prisma.analyticsConsentEvent.create({ data: { visitorId, choice: "revoked", policyVersion: ANALYTICS_CONSENT_VERSION, expiresAt: new Date("2030-01-01") } });
    await cleanupExpiredAnalyticsConsent(new Date("2026-10-24"));
    assert.deepEqual((await prisma.analyticsConsentEvent.findMany({ where: { visitorId } })).map(event => event.choice), ["revoked"]);
  } finally { await prisma.analyticsConsentEvent.deleteMany({ where: { visitorId } }); }
});

test("три календарных года ограничены последним днём февраля", () => {
  assert.equal(consentExpiry(new Date("2024-02-29T12:00:00.000Z")).toISOString(), "2027-02-28T12:00:00.000Z");
});
