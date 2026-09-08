import assert from "node:assert/strict";
import test from "node:test";
import { checkReadiness } from "@/server/operations/readiness";

test("readiness reports dependency failures without internal details", async () => {
  const healthy = await checkReadiness(async () => 1, async () => undefined);
  assert.equal(healthy.ready, true);
  assert.deepEqual(healthy.checks, { app: "ok", database: "ok", storage: "ok" });
  const failed = await checkReadiness(async () => { throw new Error("secret database detail"); }, async () => undefined);
  assert.equal(failed.ready, false);
  assert.deepEqual(failed.checks, { app: "ok", database: "failed", storage: "ok" });
  assert.equal(JSON.stringify(failed.checks).includes("secret"), false);
});
