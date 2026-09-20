import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("./PageMotion.tsx", import.meta.url), "utf8");

test("homepage reveals are one-shot and never reset visible content", () => {
  assert.match(component, /if \(entry\.isIntersecting\) \{[\s\S]*animation\.play\(\);[\s\S]*revealObserver\.unobserve\(entry\.target\);/);
  assert.doesNotMatch(component, /animation\.pause\(0\)/);
});
