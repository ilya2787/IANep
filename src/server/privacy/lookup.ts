import { createHmac } from "node:crypto";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const MIN_SECRET_BYTES = 32;

export function normalizePrivacyEmail(email: string) {
  return emailSchema.parse(email.normalize("NFKC"));
}

export function privacyLookupSecret(env: Record<string, string | undefined> = process.env) {
  const secret = env.PRIVACY_LOOKUP_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES || secret.includes("replace-with")) {
    throw new Error("PRIVACY_LOOKUP_SECRET не настроен или короче 32 байт.");
  }
  return secret;
}

export function privacyLookupReady(env: Record<string, string | undefined> = process.env) {
  try { privacyLookupSecret(env); return true; } catch { return false; }
}

export function createPrivacyLookupKey(email: string, secret = privacyLookupSecret()) {
  return createHmac("sha256", secret).update(normalizePrivacyEmail(email), "utf8").digest("hex");
}

export async function findCompletedPrivacyRequests(email: string, actor: { side: "ADMIN" | "CLIENT" }) {
  if (actor.side !== "ADMIN") throw new Error("Проверка исполненных запросов доступна только администратору.");
  const lookupKey = createPrivacyLookupKey(email);
  const { prisma } = await import("@/server/db/prisma");
  return prisma.personalDataRequest.findMany({
    where: { lookupKey, completedAt: { not: null }, status: { in: ["COMPLETED", "COMPLETED_WITH_WARNINGS"] } },
    select: { number: true, receivedAt: true, dueAt: true, completedAt: true, scope: true, destroyedCategories: true, excludedCategories: true, result: true, channel: true },
    orderBy: { completedAt: "desc" },
  });
}
