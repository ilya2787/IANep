import { createHash } from "node:crypto";

type Attempt = { count: number; resetAt: number };
type RateLimitOptions = { limit: number; windowMs: number; now?: number };

const globalState = globalThis as unknown as { ianepRateLimits?: Map<string, Attempt> };
const attempts = globalState.ianepRateLimits ?? new Map<string, Attempt>();
globalState.ianepRateLimits = attempts;

function hashed(scope: string, identifier: string) {
  return `${scope}:${createHash("sha256").update(identifier).digest("base64url")}`;
}

export function consumeRateLimit(scope: string, identifier: string, options: RateLimitOptions) {
  const now = options.now ?? Date.now();
  if (attempts.size >= 10_000) {
    for (const [storedKey, attempt] of attempts) if (attempt.resetAt <= now) attempts.delete(storedKey);
  }
  if (attempts.size >= 20_000) return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(options.windowMs / 1000) };
  const key = hashed(scope, identifier);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= options.limit) return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, remaining: options.limit - current.count, retryAfterSeconds: 0 };
}

export function isRateLimited(scope: string, identifier: string, options: RateLimitOptions) {
  const now = options.now ?? Date.now();
  const current = attempts.get(hashed(scope, identifier));
  if (!current || current.resetAt <= now) return false;
  return current.count >= options.limit;
}

export function clearRateLimit(scope: string, identifier: string) { attempts.delete(hashed(scope, identifier)); }
export function resetRateLimitsForTests() { attempts.clear(); }
