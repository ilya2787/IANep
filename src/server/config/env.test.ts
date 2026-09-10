import assert from "node:assert/strict";
import test from "node:test";
import { smtpEnvironment, validateProductionEnvironment } from "@/server/config/env";

const valid = {
  NODE_ENV: "production", DATABASE_URL: "postgresql://ianep:secret@db.internal/ianep", ADMIN_SESSION_SECRET: "x".repeat(32),
  APP_BASE_URL: "https://ianep.example", CORS_ALLOWED_ORIGINS: "https://ianep.example", IANEP_STORAGE_DIR: "/private/tmp",
  TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-real-ip", SMTP_ENABLED: "false",
} as NodeJS.ProcessEnv;

test("production environment accepts a coherent minimal configuration", () => assert.doesNotThrow(() => validateProductionEnvironment(valid)));
test("production environment rejects HTTP and relative storage", () => {
  assert.throws(() => validateProductionEnvironment({ ...valid, APP_BASE_URL: "http://ianep.example" }), /HTTPS/);
  assert.throws(() => validateProductionEnvironment({ ...valid, IANEP_STORAGE_DIR: ".storage" }), /absolute persistent path/);
});
test("SMTP is validated as one coherent set", () => {
  assert.throws(() => validateProductionEnvironment({ ...valid, SMTP_ENABLED: "true", SMTP_HOST: "smtp.example", SMTP_PORT: "invalid", SMTP_FROM: "mail@example.com" }), /SMTP_PORT/);
  assert.doesNotThrow(() => validateProductionEnvironment({ ...valid, SMTP_ENABLED: "true", SMTP_HOST: "smtp.example", SMTP_PORT: "587", SMTP_FROM: "mail@example.com", SMTP_REPLY_TO: "reply@example.com" }));
});
test("SMTP transport parses secure boolean without silently falling back to false", () => {
  const base = { SMTP_ENABLED: "true", SMTP_HOST: "smtp.beget.com", SMTP_PORT: "465", SMTP_FROM: "mail@example.com" };
  assert.equal(smtpEnvironment({ ...base, SMTP_SECURE: "true" })?.transport.secure, true);
  assert.equal(smtpEnvironment({ ...base, SMTP_SECURE: " TRUE\r" })?.transport.secure, true);
  assert.equal(smtpEnvironment({ ...base, SMTP_SECURE: "false" })?.transport.secure, true);
  assert.equal(smtpEnvironment(base)?.transport.secure, true);
  assert.throws(() => smtpEnvironment({ ...base, SMTP_SECURE: "yes" }));
});
