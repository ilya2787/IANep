import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync(new URL("./Hero.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./Hero.module.css", import.meta.url), "utf8");

test("hero content is visible independently of image readiness", () => {
  assert.doesNotMatch(hero, /data-hero-ready=/);
  assert.doesNotMatch(hero, /loadingVeil/);
  assert.doesNotMatch(styles, /\.loadingVeil/);
  assert.match(hero, /showPlaceholder=\{false\}/);
});

test("image remains visible if Safari misses its cached load event", () => {
  assert.match(readFileSync(new URL("../ui/ProgressiveImage.module.css", import.meta.url), "utf8"), /\.imageLoading\s*\{\s*[^}]*opacity:\s*1;/);
});
