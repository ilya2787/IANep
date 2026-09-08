import assert from "node:assert/strict";
import test from "node:test";
import { consumeRateLimit, resetRateLimitsForTests } from "@/server/security/rate-limit";

test("single-process limiter blocks after the configured count and resets", () => {
  resetRateLimitsForTests();
  assert.equal(consumeRateLimit("test", "address", { limit: 2, windowMs: 1000, now: 100 }).allowed, true);
  assert.equal(consumeRateLimit("test", "address", { limit: 2, windowMs: 1000, now: 101 }).allowed, true);
  const blocked = consumeRateLimit("test", "address", { limit: 2, windowMs: 1000, now: 102 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(consumeRateLimit("test", "address", { limit: 2, windowMs: 1000, now: 1100 }).allowed, true);
});
