import { clearRateLimit, consumeRateLimit, isRateLimited } from "@/server/security/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS = 5;

export function canAttemptAdminLogin(identifier: string) {
  return !isRateLimited("login", identifier, { limit: LOGIN_ATTEMPTS, windowMs: LOGIN_WINDOW_MS });
}

export function recordAdminLoginFailure(identifier: string) {
  consumeRateLimit("login", identifier, { limit: LOGIN_ATTEMPTS, windowMs: LOGIN_WINDOW_MS });
}

export function clearAdminLoginFailures(identifier: string) {
  clearRateLimit("login", identifier);
}
