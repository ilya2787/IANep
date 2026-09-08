import { randomUUID } from "node:crypto";

type LogDetails = Record<string, string | number | boolean | null | undefined>;

export function requestId(headers?: Headers) {
  const candidate = headers?.get("x-request-id");
  return candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}

export function operationalError(event: string, error: unknown, details: LogDetails = {}) {
  console.error(JSON.stringify({
    level: "error", event, ...details,
    errorType: error instanceof Error ? error.name : "UnknownError",
    timestamp: new Date().toISOString(),
  }));
}
