import assert from "node:assert/strict";
import test from "node:test";

import { BriefRateLimiter, BRIEF_RATE_LIMIT_WINDOW_MS, briefRateLimitKey } from "./brief-rate-limit";
import { prisma } from "@/server/db/prisma";

test("DB-backed Brief limiter enforces a rolling window independently per normalized IP hash", async () => {
  const start = new Date("2026-09-13T10:00:00.000Z");
  let now = start;
  const limiter = new BriefRateLimiter(prisma, () => now);
  const firstIp = "2001:db8::1";
  const secondIp = "198.51.100.20";
  const concurrentIp = "192.0.2.44";
  const hashes = [briefRateLimitKey(firstIp), briefRateLimitKey(secondIp), briefRateLimitKey(concurrentIp)];

  try {
    assert.equal((await limiter.consume(firstIp)).allowed, true);
    now = new Date(start.getTime() + 1_000);
    assert.equal((await limiter.consume(firstIp)).allowed, true);
    now = new Date(start.getTime() + 2_000);
    const blocked = await limiter.consume(firstIp);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 3_598);
    assert.equal((await limiter.consume(secondIp)).allowed, true);
    const concurrent = await Promise.all([limiter.consume(concurrentIp), limiter.consume(concurrentIp), limiter.consume(concurrentIp)]);
    assert.equal(concurrent.filter((result) => result.allowed).length, 2);
    assert.equal(concurrent.filter((result) => !result.allowed).length, 1);

    const stored = await prisma.briefRateLimitAttempt.findMany({ where: { keyHash: { in: hashes } } });
    assert.equal(stored.length, 5);
    assert.ok(stored.every((attempt) => hashes.includes(attempt.keyHash)));
    assert.equal(JSON.stringify(stored).includes(firstIp), false);
    assert.equal(JSON.stringify(stored).includes(secondIp), false);

    now = new Date(start.getTime() + BRIEF_RATE_LIMIT_WINDOW_MS + 1);
    assert.equal((await limiter.consume(firstIp)).allowed, true);
  } finally {
    await prisma.briefRateLimitAttempt.deleteMany({ where: { keyHash: { in: hashes } } });
    await prisma.$disconnect();
  }
});
