import { createHmac } from "node:crypto";
import { normalizeEmail, normalizeRussianPhone } from "@/server/contact/normalization";
const MIN_SECRET_BYTES = 32;

export type PrivacyLookupType = "EMAIL" | "PHONE" | "NONE";

export function normalizePrivacyEmail(email: string) {
  return normalizeEmail(email);
}

export const normalizePrivacyPhone = normalizeRussianPhone;

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

export function createPrivacyLookupHash(type: Exclude<PrivacyLookupType, "NONE">, value: string, secret = privacyLookupSecret()) {
  const normalized = type === "EMAIL" ? normalizePrivacyEmail(value) : normalizePrivacyPhone(value);
  return createHmac("sha256", secret).update(normalized, "utf8").digest("hex");
}

export const createPrivacyLookupKey = (email: string, secret = privacyLookupSecret()) => createPrivacyLookupHash("EMAIL", email, secret);

export async function findCompletedPrivacyRequests(type: Exclude<PrivacyLookupType, "NONE">, value: string, actor: { side: "ADMIN" | "CLIENT" }) {
  if (actor.side !== "ADMIN") throw new Error("Проверка исполненных запросов доступна только администратору.");
  const lookupHash = createPrivacyLookupHash(type, value);
  const { prisma } = await import("@/server/db/prisma");
  return prisma.personalDataRequest.findMany({
    where: { lookupType: type, lookupHash, completedAt: { not: null }, receiptPurgedAt: null, receiptExpiresAt: { gt: new Date() }, status: { in: ["COMPLETED", "COMPLETED_WITH_WARNINGS"] } },
    select: { number: true, receivedAt: true, dueAt: true, completedAt: true, scope: true, destroyedCategories: true, excludedCategories: true, result: true, channel: true },
    orderBy: { completedAt: "desc" },
  });
}
