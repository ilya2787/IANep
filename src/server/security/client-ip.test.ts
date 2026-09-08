import assert from "node:assert/strict";
import test from "node:test";
import { clientIp } from "@/server/security/client-ip";

test("proxy IP headers are ignored unless explicitly trusted", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.8", "x-forwarded-for": "198.51.100.2, 10.0.0.2" });
  assert.equal(clientIp(headers, {}), "untrusted-peer");
  assert.equal(clientIp(headers, { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-real-ip" }), "203.0.113.8");
  assert.equal(clientIp(headers, { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-forwarded-for" }), "198.51.100.2");
});

test("invalid proxy IP is not accepted", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "spoofed" }), { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-real-ip" }), "unknown-proxy-peer");
});
