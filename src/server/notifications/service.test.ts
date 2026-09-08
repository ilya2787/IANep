import assert from "node:assert/strict";
import test from "node:test";
import { notificationRetryDelayMs } from "@/server/notifications/retry";

test("notification retry uses bounded exponential backoff", () => {
  assert.equal(notificationRetryDelayMs(1), 120_000);
  assert.equal(notificationRetryDelayMs(5), 1_920_000);
  assert.equal(notificationRetryDelayMs(20), 3_600_000);
});
