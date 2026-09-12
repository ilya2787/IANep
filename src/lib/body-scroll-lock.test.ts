import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  acquireBodyScrollLock,
  getBodyScrollLockCount,
  resetBodyScrollLockForTests,
  type ScrollLockEnvironment,
} from "./body-scroll-lock";

function fakeStyle(initial: Record<string, string> = {}) {
  let values = { ...initial };
  const target = {
    get cssText() { return JSON.stringify(values); },
    set cssText(value: string) { values = value ? JSON.parse(value) : {}; },
    getPropertyValue(property: string) { return values[property] ?? ""; },
    setProperty(property: string, value: string) { values[property] = value; },
    removeProperty(property: string) { const value = values[property] ?? ""; delete values[property]; return value; },
  };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return Reflect.get(object, property, object);
      return typeof property === "string" ? values[property] ?? "" : undefined;
    },
    set(object, property, value) {
      if (property === "cssText") return Reflect.set(object, property, value, object);
      if (typeof property === "string") values[property] = String(value);
      return true;
    },
  }) as unknown as CSSStyleDeclaration;
}

function environment() {
  const bodyStyle = fakeStyle({ overflow: "auto", paddingRight: "5px", color: "red" });
  const htmlStyle = fakeStyle({ overflow: "visible", "--modal-viewport-height": "777px" });
  let resize: (() => void) | undefined;
  const scrollCalls: ScrollToOptions[] = [];
  const visualViewport = {
    height: 720,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => { resize = listener as () => void; },
    removeEventListener: () => { resize = undefined; },
  };
  const env = {
    document: { documentElement: { clientWidth: 1185, style: htmlStyle }, body: { style: bodyStyle } },
    window: {
      scrollX: 12,
      scrollY: 640,
      innerWidth: 1200,
      innerHeight: 800,
      visualViewport,
      getComputedStyle: () => ({ paddingRight: "5px" }),
      scrollTo: (options: ScrollToOptions) => { scrollCalls.push(options); },
    },
  } as unknown as ScrollLockEnvironment;
  return { env, bodyStyle, htmlStyle, scrollCalls, visualViewport, resize: () => resize?.() };
}

afterEach(resetBodyScrollLockForTests);

test("reference-counts owners and restores scroll and all original inline styles", () => {
  const fixture = environment();
  const originalBody = fixture.bodyStyle.cssText;
  const originalHtml = fixture.htmlStyle.cssText;
  const releaseFirst = acquireBodyScrollLock(fixture.env);
  const releaseSecond = acquireBodyScrollLock(fixture.env);

  assert.equal(getBodyScrollLockCount(), 2);
  assert.equal(fixture.bodyStyle.position, "fixed");
  assert.equal(fixture.bodyStyle.top, "-640px");
  assert.equal(fixture.bodyStyle.left, "-12px");
  assert.equal(fixture.bodyStyle.paddingRight, "calc(5px + 15px)");
  assert.equal(fixture.htmlStyle.overflow, "hidden");
  assert.equal(fixture.htmlStyle.getPropertyValue("--body-scrollbar-width"), "15px");
  assert.equal(fixture.htmlStyle.getPropertyValue("--modal-viewport-height"), "720px");

  releaseFirst();
  assert.equal(getBodyScrollLockCount(), 1);
  assert.equal(fixture.bodyStyle.position, "fixed");
  assert.equal(fixture.scrollCalls.length, 0);

  releaseSecond();
  assert.equal(getBodyScrollLockCount(), 0);
  assert.equal(fixture.bodyStyle.cssText, originalBody);
  assert.equal(fixture.htmlStyle.cssText, originalHtml);
  assert.deepEqual(fixture.scrollCalls, [{ left: 12, top: 640, behavior: "instant" }]);
});

test("release is idempotent and visual viewport height tracks resize", () => {
  const fixture = environment();
  const release = acquireBodyScrollLock(fixture.env);
  fixture.visualViewport.height = 612;
  fixture.resize();
  assert.equal(fixture.htmlStyle.getPropertyValue("--modal-viewport-height"), "612px");

  release();
  release();
  assert.equal(getBodyScrollLockCount(), 0);
  assert.equal(fixture.scrollCalls.length, 1);
});

test("is safe when rendered without a browser environment", () => {
  const release = acquireBodyScrollLock(null);
  release();
  assert.equal(getBodyScrollLockCount(), 0);
});
