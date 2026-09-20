import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");

test("pass-system screenshot placeholders are bounded by their own frames", () => {
  assert.match(styles, /\.shot a\s*\{[^}]*position:\s*relative;/);
});
