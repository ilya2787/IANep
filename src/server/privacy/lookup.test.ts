import assert from "node:assert/strict";
import test from "node:test";
import { createPrivacyLookupKey, normalizePrivacyEmail, privacyLookupSecret } from "./lookup";

test("HMAC lookup детерминирован и нормализует email", () => {
  const secret = "one-independent-privacy-secret-32-bytes";
  assert.equal(normalizePrivacyEmail("  User@Example.RU "), "user@example.ru");
  assert.equal(createPrivacyLookupKey("User@Example.RU", secret), createPrivacyLookupKey(" user@example.ru ", secret));
});

test("разные секреты дают разные lookup-ключи", () => {
  assert.notEqual(createPrivacyLookupKey("user@example.ru", "first-independent-secret-at-least-32"), createPrivacyLookupKey("user@example.ru", "second-independent-secret-at-least-32"));
});

test("небезопасный или шаблонный секрет отклоняется", () => {
  assert.throws(() => privacyLookupSecret({ PRIVACY_LOOKUP_SECRET: "short" }));
  assert.throws(() => privacyLookupSecret({ PRIVACY_LOOKUP_SECRET: "replace-with-a-secret-that-is-long-enough" }));
});
