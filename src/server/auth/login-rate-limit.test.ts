import assert from "node:assert/strict";
import test from "node:test";
import { canAttemptAdminLogin, clearAdminLoginFailures, recordAdminLoginFailure } from "@/server/auth/login-rate-limit";
import { resetRateLimitsForTests } from "@/server/security/rate-limit";

test("admin/client login limiter blocks five failed attempts and clears after success", () => {
  resetRateLimitsForTests();
  const identifier = "client:203.0.113.5:user";
  for (let index = 0; index < 5; index += 1) {
    assert.equal(canAttemptAdminLogin(identifier), true);
    recordAdminLoginFailure(identifier);
  }
  assert.equal(canAttemptAdminLogin(identifier), false);
  clearAdminLoginFailures(identifier);
  assert.equal(canAttemptAdminLogin(identifier), true);
});
