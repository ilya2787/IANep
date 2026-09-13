import assert from "node:assert/strict";
import test from "node:test";
import { clientIp, normalizeIp } from "@/server/security/client-ip";

test("proxy IP headers are ignored unless explicitly trusted", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.8", "x-forwarded-for": "198.51.100.2, 10.0.0.2" });
  assert.equal(clientIp(headers, {}), "untrusted-peer");
  assert.equal(clientIp(headers, { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-real-ip" }), "203.0.113.8");
  assert.equal(clientIp(headers, { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-forwarded-for" }), "198.51.100.2");
});

test("invalid proxy IP is not accepted", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "spoofed" }), { TRUST_PROXY_HEADERS: "true", CLIENT_IP_HEADER: "x-real-ip" }), "unknown-proxy-peer");
});

test("IPv4 and IPv6 addresses are normalized deterministically", () => {
  assert.equal(normalizeIp("203.000.113.008"), null);
  assert.equal(normalizeIp("203.0.113.8"), "203.0.113.8");
  assert.equal(normalizeIp("2001:0DB8:0:0:0:0:0:1"), "2001:db8::1");
  assert.equal(normalizeIp("2001:db8::1"), "2001:db8::1");
  assert.equal(normalizeIp("::ffff:192.0.2.128"), "192.0.2.128");
  assert.equal(normalizeIp("::ffff:c000:0280"), "192.0.2.128");
});
