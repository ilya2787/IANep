import { createHmac } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export const BRIEF_RATE_LIMIT = 2;
export const BRIEF_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const HASH_PURPOSE = "ianep:brief-rate-limit:v1";

type Clock = () => Date;

export function briefRateLimitKey(clientIp: string, secret = process.env.ADMIN_SESSION_SECRET) {
  if (!secret) throw new Error("BRIEF_RATE_LIMIT_SECRET_UNAVAILABLE");
  return createHmac("sha256", secret).update(`${HASH_PURPOSE}\0${clientIp}`).digest("hex");
}

export class BriefRateLimiter {
  constructor(private readonly db: PrismaClient = prisma, private readonly clock: Clock = () => new Date()) {}

  async consume(clientIp: string) {
    const now = this.clock();
    const cutoff = new Date(now.getTime() - BRIEF_RATE_LIMIT_WINDOW_MS);
    const keyHash = briefRateLimitKey(clientIp);

    return this.db.$transaction(async (tx) => {
      // Serialize attempts for one pseudonymous IP key across all application instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${keyHash}, 0))`;
      await tx.briefRateLimitAttempt.deleteMany({ where: { attemptedAt: { lt: cutoff } } });
      const recent = await tx.briefRateLimitAttempt.findMany({
        where: { keyHash, attemptedAt: { gte: cutoff } },
        orderBy: { attemptedAt: "asc" },
        take: BRIEF_RATE_LIMIT,
        select: { attemptedAt: true },
      });
      if (recent.length >= BRIEF_RATE_LIMIT) {
        const retryAt = recent[0].attemptedAt.getTime() + BRIEF_RATE_LIMIT_WINDOW_MS;
        return { allowed: false as const, retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000)) };
      }
      await tx.briefRateLimitAttempt.create({ data: { keyHash, attemptedAt: now } });
      return { allowed: true as const, retryAfterSeconds: 0 };
    });
  }

  async cleanupExpired() {
    const cutoff = new Date(this.clock().getTime() - BRIEF_RATE_LIMIT_WINDOW_MS);
    return this.db.briefRateLimitAttempt.deleteMany({ where: { attemptedAt: { lt: cutoff } } });
  }
}

export const briefRateLimiter = new BriefRateLimiter();
