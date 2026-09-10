import { accessSync, constants } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { z } from "zod";

const booleanString = z.enum(["true", "false"]);
const portString = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(65535));
const emailAddress = z.string().email();
const emailDisplayName = z.string().trim().min(1).max(100).refine(value => !/[\r\n]/.test(value));

type Environment = Record<string, string | undefined>;

function booleanEnvironment(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return booleanString.parse(value.trim().toLowerCase()) === "true";
}

function absoluteUrl(value: string, name: string, https: boolean) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`Production configuration invalid: ${name} must be an absolute URL`); }
  if (!['http:', 'https:'].includes(url.protocol) || (https && url.protocol !== 'https:')) {
    throw new Error(`Production configuration invalid: ${name} must use ${https ? 'HTTPS' : 'HTTP or HTTPS'}`);
  }
  if (url.username || url.password || url.search || url.hash) throw new Error(`Production configuration invalid: ${name} must not contain credentials, query, or fragment`);
  return url;
}

export function validateProductionEnvironment(env: Environment = process.env) {
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;

  const required = ["DATABASE_URL", "ADMIN_SESSION_SECRET", "APP_BASE_URL", "CORS_ALLOWED_ORIGINS", "IANEP_STORAGE_DIR"] as const;
  for (const name of required) {
    if (!env[name] || env[name]!.includes("replace-with")) throw new Error(`Production configuration missing: ${name}`);
  }

  let database: URL;
  try { database = new URL(env.DATABASE_URL!); } catch { throw new Error("Production configuration invalid: DATABASE_URL must be an absolute PostgreSQL URL"); }
  if (!["postgres:", "postgresql:"].includes(database.protocol)) throw new Error("Production configuration invalid: DATABASE_URL must use PostgreSQL");
  if (env.ADMIN_SESSION_SECRET!.length < 32) throw new Error("Production configuration invalid: ADMIN_SESSION_SECRET must contain at least 32 characters");

  const appUrl = absoluteUrl(env.APP_BASE_URL!, "APP_BASE_URL", true);
  const origins = env.CORS_ALLOWED_ORIGINS!.split(",").map(value => value.trim()).filter(Boolean).map((value, index) => absoluteUrl(value, `CORS_ALLOWED_ORIGINS[${index}]`, true));
  if (!origins.length || origins.some(url => url.origin !== url.toString().replace(/\/$/, ""))) throw new Error("Production configuration invalid: CORS_ALLOWED_ORIGINS must contain origins only");
  if (!origins.some(url => url.origin === appUrl.origin)) throw new Error("Production configuration invalid: CORS_ALLOWED_ORIGINS must include APP_BASE_URL origin");

  if (!isAbsolute(env.IANEP_STORAGE_DIR!)) throw new Error("Production configuration invalid: IANEP_STORAGE_DIR must be an absolute persistent path");
  const storage = resolve(env.IANEP_STORAGE_DIR!);
  try { accessSync(storage, constants.R_OK | constants.W_OK); } catch { throw new Error("Production configuration invalid: IANEP_STORAGE_DIR must already exist and be readable/writable"); }

  let smtpEnabled: boolean;
  let trustProxy: boolean;
  try { smtpEnabled = booleanEnvironment(env.SMTP_ENABLED); } catch { throw new Error("Production configuration invalid: SMTP_ENABLED must be true or false"); }
  try { trustProxy = booleanEnvironment(env.TRUST_PROXY_HEADERS); } catch { throw new Error("Production configuration invalid: TRUST_PROXY_HEADERS must be true or false"); }
  if (trustProxy && !["x-real-ip", "x-forwarded-for"].includes(env.CLIENT_IP_HEADER ?? "")) throw new Error("Production configuration invalid: CLIENT_IP_HEADER must be x-real-ip or x-forwarded-for");

  if (smtpEnabled) {
    for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"] as const) if (!env[name]) throw new Error(`Production configuration missing: ${name}`);
    if (!portString.safeParse(env.SMTP_PORT).success) throw new Error("Production configuration invalid: SMTP_PORT");
    if (!emailAddress.safeParse(env.SMTP_FROM).success) throw new Error("Production configuration invalid: SMTP_FROM");
    if (env.SMTP_FROM_NAME && !emailDisplayName.safeParse(env.SMTP_FROM_NAME).success) throw new Error("Production configuration invalid: SMTP_FROM_NAME");
    if (env.SMTP_REPLY_TO && !emailAddress.safeParse(env.SMTP_REPLY_TO).success) throw new Error("Production configuration invalid: SMTP_REPLY_TO");
    if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) throw new Error("Production configuration invalid: SMTP_USER and SMTP_PASS must be configured together");
    try { booleanEnvironment(env.SMTP_SECURE, env.SMTP_PORT === "465"); } catch { throw new Error("Production configuration invalid: SMTP_SECURE must be true or false"); }
  }
}

export function smtpEnvironment(env: Environment = process.env) {
  if (!booleanEnvironment(env.SMTP_ENABLED)) return null;
  const port = portString.parse(env.SMTP_PORT);
  const configuredSecure = booleanEnvironment(env.SMTP_SECURE, port === 465);
  return {
    from: emailAddress.parse(env.SMTP_FROM),
    fromName: emailDisplayName.parse(env.SMTP_FROM_NAME || "IANep"),
    replyTo: env.SMTP_REPLY_TO ? emailAddress.parse(env.SMTP_REPLY_TO) : undefined,
    transport: {
      host: z.string().min(1).parse(env.SMTP_HOST), port, secure: port === 465 || configuredSecure,
      ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    },
  };
}
