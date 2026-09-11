import assert from "node:assert/strict";
import test from "node:test";
import { createPrivacyLookupHash, createPrivacyLookupKey, normalizePrivacyEmail, normalizePrivacyPhone, privacyLookupSecret } from "./lookup";

test("HMAC lookup детерминирован и нормализует email", () => {
  const secret = "one-independent-privacy-secret-32-bytes";
  assert.equal(normalizePrivacyEmail("  User@Example.RU "), "user@example.ru");
  assert.equal(createPrivacyLookupKey("User@Example.RU", secret), createPrivacyLookupKey(" user@example.ru ", secret));
});

test("российские форматы телефона дают один canonical и HMAC", () => {
  const secret = "one-independent-privacy-secret-32-bytes";
  const values = ["+7 (999) 123-45-67", "8 999 123 45 67", "79991234567"];
  assert.deepEqual(values.map(normalizePrivacyPhone), ["+79991234567", "+79991234567", "+79991234567"]);
  assert.equal(new Set(values.map(value => createPrivacyLookupHash("PHONE", value, secret))).size, 1);
  assert.throws(() => normalizePrivacyPhone("9991234567"), /11 цифр/);
});

test("одинаковая строка с разными lookupType не конфликтует", () => {
  const secret = "one-independent-privacy-secret-32-bytes";
  assert.notEqual(createPrivacyLookupHash("EMAIL", "79991234567@example.ru", secret), createPrivacyLookupHash("PHONE", "79991234567", secret));
});

test("разные секреты дают разные lookup-ключи", () => {
  assert.notEqual(createPrivacyLookupKey("user@example.ru", "first-independent-secret-at-least-32"), createPrivacyLookupKey("user@example.ru", "second-independent-secret-at-least-32"));
});

test("небезопасный или шаблонный секрет отклоняется", () => {
  assert.throws(() => privacyLookupSecret({ PRIVACY_LOOKUP_SECRET: "short" }));
  assert.throws(() => privacyLookupSecret({ PRIVACY_LOOKUP_SECRET: "replace-with-a-secret-that-is-long-enough" }));
});
