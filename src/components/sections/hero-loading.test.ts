import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync(new URL("./Hero.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./Hero.module.css", import.meta.url), "utf8");

test("hero owns a section-wide visual veil driven by mascot readiness", () => {
  assert.match(hero, /data-hero-ready=/);
  assert.match(hero, /onReady=\{revealHero\}/);
  assert.match(hero, /showPlaceholder=\{false\}/);
  assert.match(hero, /className=\{styles\.loadingVeil\}/);
  assert.match(styles, /\.loadingVeil\s*\{[\s\S]*inset:\s*0;/);
  assert.match(styles, /hero\[data-hero-ready="true"\]/);
});

test("hero loading has a bounded error fallback and does not intercept navigation", () => {
  assert.match(hero, /setTimeout\(revealHero, 10_000\)/);
  assert.match(styles, /\.loadingVeil\s*\{[\s\S]*pointer-events:\s*none;/);
});
