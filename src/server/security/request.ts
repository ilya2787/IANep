import { headers } from "next/headers";
import { validateProductionEnvironment } from "@/server/config/env";

export async function requireSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) throw new Error("CSRF_CHECK_FAILED");
  const allowed = new Set((process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
  const originUrl = new URL(origin);
  if (originUrl.host !== host && !allowed.has(origin)) throw new Error("CSRF_CHECK_FAILED");
}

export function assertProductionConfiguration() {
  validateProductionEnvironment();
}
