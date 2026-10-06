import assert from "node:assert/strict";
import test from "node:test";
import robots from "./robots";
import sitemap from "./sitemap";

test("sitemap contains only canonical public pages", () => {
  const urls = sitemap().map(entry => entry.url);
  assert.equal(urls.length, 7);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => url.startsWith("https://ianep.ru/")));
  assert.ok(urls.every(url => !/^https:\/\/ianep\.ru\/(?:admin|client|api)(?:\/|$)/.test(url)));
});

test("robots keeps workspaces and APIs out of the crawl", () => {
  const document = robots();
  assert.equal(document.sitemap, "https://ianep.ru/sitemap.xml");
  assert.deepEqual(document.rules, { userAgent: "*", allow: "/", disallow: ["/admin", "/client", "/api"] });
});
