import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCompleteImageState } from "./progressive-image-state";

const component = readFileSync(new URL("./ProgressiveImage.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./ProgressiveImage.module.css", import.meta.url), "utf8");
const projectCase = readFileSync(new URL("../sections/ProjectCase.tsx", import.meta.url), "utf8");

test("cached complete images settle from their real DOM state on mount", () => {
  assert.match(component, /useLayoutEffect\(\(\) => \{/);
  assert.equal(getCompleteImageState({ complete: true, naturalWidth: 640 }), "loaded");
  assert.equal(getCompleteImageState({ complete: true, naturalWidth: 0 }), "error");
  assert.equal(getCompleteImageState({ complete: false, naturalWidth: 0 }), null);
  assert.match(component, /getCompleteImageState\(image\)/);
});

test("normal load and error both settle the placeholder", () => {
  assert.match(component, /const handleLoad[\s\S]*settle\("loaded"\)/);
  assert.match(component, /const handleError[\s\S]*settle\("error"\)/);
  assert.match(component, /state !== "loading" \? styles\.placeholderSettled/);
  assert.match(styles, /\.placeholderSettled\s*\{\s*opacity:\s*0;/);
});

test("each source owns an independent lifecycle and stale callbacks cannot update it", () => {
  assert.match(component, /const source = typeof props\.src === "string"[\s\S]*props\.src\.default\.src;/);
  assert.match(component, /<ProgressiveImageLifecycle[\s\S]*key=\{source\}/);
  assert.match(component, /if \(settledRef\.current\) return;/);
});

test("successful load is not blocked on decode and error reveals a usable fallback", () => {
  assert.doesNotMatch(component, /\.decode\(/);
  assert.match(styles, /\.imageError\s*\{\s*opacity:\s*1;/);
});

test("a failed optimized local image retries its original public URL once", () => {
  assert.match(component, /const \[useOriginalSource, setUseOriginalSource\] = useState\(false\)/);
  assert.match(component, /typeof props\.src === "string" && props\.src\.startsWith\("\/"\) && !props\.unoptimized/);
  assert.match(component, /if \(canRetryOriginal && !useOriginalSource\) \{\s*setUseOriginalSource\(true\);\s*return;/);
  assert.match(component, /unoptimized=\{props\.unoptimized \|\| useOriginalSource\}/);
});

test("project mockup layers bypass DPR-specific optimizer stalls in WebKit", () => {
  const layers = projectCase.match(/<ProgressiveImage[\s\S]*?\/>/g) ?? [];
  assert.equal(layers.length, 4);
  for (const layer of layers) {
    assert.match(layer, /loading="eager"/);
    assert.match(layer, /unoptimized/);
  }
});
