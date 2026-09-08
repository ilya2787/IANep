import assert from "node:assert/strict";
import test from "node:test";
import { BodyTooLargeError, readJsonBody } from "@/server/security/body";

test("JSON body reader enforces declared and streamed limits", async () => {
  await assert.rejects(() => readJsonBody(new Request("http://localhost", { method: "POST", headers: { "content-length": "100" }, body: "{}" }), 10), BodyTooLargeError);
  await assert.rejects(() => readJsonBody(new Request("http://localhost", { method: "POST", body: JSON.stringify({ value: "x".repeat(20) }) }), 10), BodyTooLargeError);
  assert.deepEqual(await readJsonBody(new Request("http://localhost", { method: "POST", body: '{"ok":true}' }), 20), { ok: true });
});
