import { isIP } from "node:net";

export function clientIp(requestHeaders: Pick<Headers, "get">, env: Record<string, string | undefined> = process.env) {
  if (env.TRUST_PROXY_HEADERS !== "true") return "untrusted-peer";
  const name = env.CLIENT_IP_HEADER;
  if (name !== "x-real-ip" && name !== "x-forwarded-for") return "untrusted-peer";
  const raw = requestHeaders.get(name);
  const value = name === "x-forwarded-for" ? raw?.split(",")[0]?.trim() : raw?.trim();
  return value && isIP(value) ? value : "unknown-proxy-peer";
}
