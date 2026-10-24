import { prisma } from "@/server/db/prisma";
import { ANALYTICS_CONSENT_VERSION } from "@/config/analytics-consent";

export type AnalyticsConsentChoice = "allowed" | "necessary" | "revoked";

export function consentExpiry(occurredAt: Date) {
  const expiresAt = new Date(occurredAt);
  const month = expiresAt.getUTCMonth();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 3);
  if (expiresAt.getUTCMonth() !== month) expiresAt.setUTCDate(0);
  return expiresAt;
}

export async function recordAnalyticsChoice(visitorId: string, choice: AnalyticsConsentChoice) {
  const occurredAt = new Date();
  const entry = await prisma.analyticsConsentEvent.create({
    data: { visitorId, choice, policyVersion: ANALYTICS_CONSENT_VERSION, occurredAt, expiresAt: consentExpiry(occurredAt) },
    select: { id: true, occurredAt: true },
  });
  return { id: entry.id, recordedAt: entry.occurredAt.toISOString() };
}

export async function cleanupExpiredAnalyticsConsent(now = new Date()) {
  return prisma.analyticsConsentEvent.deleteMany({ where: { expiresAt: { lte: now } } });
}
