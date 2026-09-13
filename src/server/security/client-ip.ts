import { isIP } from "node:net";

export function normalizeIp(value: string) {
  const trimmed = value.trim();
  const version = isIP(trimmed);
  if (version === 4) return trimmed.split(".").map(Number).join(".");
  if (version !== 6) return null;

  const canonical = new URL(`http://[${trimmed}]/`).hostname.slice(1, -1).toLowerCase();
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
  }
  return canonical;
}

export function clientIp(requestHeaders: Pick<Headers, "get">, env: Record<string, string | undefined> = process.env) {
  if (env.TRUST_PROXY_HEADERS !== "true") return "untrusted-peer";
  const name = env.CLIENT_IP_HEADER;
  if (name !== "x-real-ip" && name !== "x-forwarded-for") return "untrusted-peer";
  const raw = requestHeaders.get(name);
  const value = name === "x-forwarded-for" ? raw?.split(",")[0]?.trim() : raw?.trim();
  return value ? normalizeIp(value) ?? "unknown-proxy-peer" : "unknown-proxy-peer";
}
