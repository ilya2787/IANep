import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ANALYTICS_CHOICE_KEY, analyticsChoice, setAnalyticsChoice, startMetrika, trackNewBrief } from './metrika';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocation = globalThis.location;
const originalStorage = globalThis.localStorage;
const originalEvent = globalThis.Event;
const originalFetch = globalThis.fetch;
const originalHistory = globalThis.history;

afterEach(() => {
  Object.assign(globalThis, { window: originalWindow, document: originalDocument, location: originalLocation, history: originalHistory, localStorage: originalStorage, Event: originalEvent, fetch: originalFetch });
});

test('счётчик не загружается до записанного разрешения', async () => {
  const values = new Map<string, string>();
  const scripts: Array<{ src: string }> = [];
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const document = { head: { appendChild: (script: { src: string }) => scripts.push(script) }, createElement: () => ({ async: false, src: '', dataset: {} }), cookie: '' };
  class FakeEvent { constructor(public type: string) {} }
  const window = { dispatchEvent: () => true, addEventListener: () => {}, history: { pushState: () => {}, replaceState: () => {} } };
  let failRecording = false;
  const fetch = async () => ({ ok: !failRecording });
  Object.assign(globalThis, { window, document, location: { href: 'https://ianep.ru/legal/cookies', origin: 'https://ianep.ru', pathname: '/legal/cookies', hostname: 'ianep.ru' }, history: window.history, localStorage, Event: FakeEvent, fetch });
  assert.equal(analyticsChoice(), null);
  startMetrika();
  await setAnalyticsChoice('necessary');
  assert.equal(scripts.length, 0);
  failRecording = true;
  await assert.rejects(setAnalyticsChoice('allowed'));
  assert.equal(scripts.length, 0);
  failRecording = false;
  await setAnalyticsChoice('allowed');
  startMetrika();
  assert.equal(values.get(ANALYTICS_CHOICE_KEY), 'allowed');
  assert.equal(scripts.length, 1);
  const calls = (window as typeof window & { ym: { a: unknown[][] } }).ym.a;
  assert.deepEqual(calls.map((call) => call[1]), ['init', 'hit']);
  assert.equal(calls[1][2], 'https://ianep.ru/legal/cookies');
  trackNewBrief(200, { id: '123e4567-e89b-42d3-a456-426614174000', replaced: true });
  trackNewBrief(201, { id: '123e4567-e89b-42d3-a456-426614174000', replaced: true });
  trackNewBrief(201, { id: 'invalid', replaced: false });
  trackNewBrief(409, { id: '123e4567-e89b-42d3-a456-426614174000', replaced: false });
  assert.equal(calls.filter((call) => call[1] === 'reachGoal').length, 0);
  trackNewBrief(201, { id: '123e4567-e89b-42d3-a456-426614174000', replaced: false });
  assert.equal(calls.filter((call) => call[1] === 'reachGoal').length, 1);
  assert.deepEqual(calls.at(-1), [113770883, 'reachGoal', 'brief_created']);
  await setAnalyticsChoice('necessary');
  trackNewBrief(201, { id: '123e4567-e89b-42d3-a456-426614174000', replaced: false });
  assert.equal(calls.filter((call) => call[1] === 'reachGoal').length, 1);
});
