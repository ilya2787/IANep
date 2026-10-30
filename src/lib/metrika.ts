import { ANALYTICS_CONSENT_VERSION, ANALYTICS_VISITOR_KEY } from "@/config/analytics-consent";
const localTestId = process.env.NODE_ENV === "production" ? NaN : Number(process.env.NEXT_PUBLIC_METRIKA_TEST_ID);
export const METRIKA_ID = Number.isInteger(localTestId) && localTestId > 0 ? localTestId : 113770883;
export const ANALYTICS_CHOICE_KEY = 'ianep-analytics-choice-v2';
const LEGACY_ANALYTICS_CHOICE_KEY = 'ianep-analytics-choice-v1';
export const ANALYTICS_CHANGE_EVENT = 'ianep:analytics-choice-change';
const disableKey = `disableYaCounter${METRIKA_ID}`;
let started = false;
let lastPageUrl: string | null = null;
let navigationGuardInstalled = false;
const publicPaths = new Set(["/", "/legal/privacy", "/legal/cookies", "/legal/brief-consent", "/legal/client-terms", "/projects/onyx-cleaning", "/projects/pass-system"]);
function campaignQuery(url: URL) {
  const allowed = new URLSearchParams();
  const rules: Record<string, RegExp> = {
    yclid: /^[A-Za-z0-9_-]{8,80}$/,
    utm_source: /^yandex$/,
    utm_medium: /^cpc$/,
    utm_campaign: /^ianep_search_ru$/,
    utm_content: /^[0-9]{1,20}$/,
  };
  for (const [key, rule] of Object.entries(rules)) {
    const values = url.searchParams.getAll(key);
    if (values.length === 1 && rule.test(values[0])) allowed.set(key, values[0]);
  }
  const query = allowed.toString();
  return query ? `?${query}` : '';
}
function cleanPublicAddress() {
  const url = new URL(location.href);
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
  if (url.origin !== location.origin || !publicPaths.has(path)) return false;
  const safe = `${url.pathname}${campaignQuery(url)}`;
  if (`${url.pathname}${url.search}${url.hash}` !== safe) history.replaceState(history.state, '', safe);
  return true;
}
function safePageUrl() {
  const path = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "");
  if (!publicPaths.has(path)) return null;
  const url = new URL(location.href);
  return !url.hash && url.search === campaignQuery(url) ? `${location.origin}${path}${url.search}` : null;
}

type MetrikaWindow = Window & {
  ym?: (...args: unknown[]) => void;
};
type QueuedYm = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
function metrikaWindow() { return window as MetrikaWindow; }
function disableCounter(value: boolean) { (window as unknown as Record<string, unknown>)[disableKey] = value; }
function guardNavigation() {
  if (navigationGuardInstalled) return;
  navigationGuardInstalled = true;
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method].bind(history);
    history[method] = ((data: unknown, unused: string, url?: string | URL | null) => {
      if (url != null && !safeUrl(new URL(url, location.href))) stopMetrika();
      return original(data, unused, url);
    }) as History[typeof method];
  }
  window.addEventListener('popstate', () => {
    if (!safeUrl(new URL(location.href))) stopMetrika();
    else startMetrika();
  });
}
function safeUrl(url: URL) {
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
  return url.origin === location.origin && publicPaths.has(path) && !url.hash && url.search === campaignQuery(url);
}
export function stopMetrika() { if (typeof window !== 'undefined') { disableCounter(true); clearMetrikaStorage(); } }

export function analyticsChoice(): 'allowed' | 'necessary' | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(ANALYTICS_CHOICE_KEY);
    if (value === 'allowed' || value === 'necessary') return value;
    return localStorage.getItem(LEGACY_ANALYTICS_CHOICE_KEY) === 'necessary' ? 'necessary' : null;
  } catch { return null; }
}

function clearMetrikaStorage() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('_ym')) localStorage.removeItem(key);
  } catch {}
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('_ym')) sessionStorage.removeItem(key);
  } catch {}
  try {
    for (const part of document.cookie.split(';')) {
      const name = part.trim().split('=')[0];
      if (!name.startsWith('_ym')) continue;
      for (const domain of ['', `; Domain=${location.hostname}`, `; Domain=.${location.hostname}`]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain}`;
      }
    }
  } catch {}
}

function visitorId() {
  let id = localStorage.getItem(ANALYTICS_VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANALYTICS_VISITOR_KEY, id);
  }
  return id;
}

export async function setAnalyticsChoice(choice: 'allowed' | 'necessary') {
  const previous = analyticsChoice();
  const legacyAllowed = localStorage.getItem(LEGACY_ANALYTICS_CHOICE_KEY) === 'allowed';
  if (choice === 'necessary') stopMetrika();
  if (choice === 'necessary') {
    localStorage.setItem(ANALYTICS_CHOICE_KEY, choice);
    window.dispatchEvent(new Event(ANALYTICS_CHANGE_EVENT));
  }
  const action = choice === 'necessary' && (previous === 'allowed' || (previous === null && legacyAllowed)) ? 'revoked' : choice;
  const response = await fetch('/api/analytics-consent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store',
    body: JSON.stringify({ visitorId: visitorId(), choice: action, version: ANALYTICS_CONSENT_VERSION }),
  });
  if (!response.ok) throw new Error('CONSENT_RECORD_FAILED');
  if (choice !== 'allowed') return;
  localStorage.setItem(ANALYTICS_CHOICE_KEY, choice);
  window.dispatchEvent(new Event(ANALYTICS_CHANGE_EVENT));
  if (previous === 'necessary' && started) {
    // После отзыва библиотека остаётся в памяти; новая загрузка восстановит счётчик.
    window.location.reload();
    return;
  }
  startMetrika();
}

export function startMetrika() {
  if (typeof window === 'undefined' || analyticsChoice() !== 'allowed') return;
  guardNavigation();
  if (!cleanPublicAddress()) { if (started) stopMetrika(); return; }
  const pageUrl = safePageUrl();
  if (!pageUrl) { if (started) { stopMetrika(); lastPageUrl = null; } return; }
  const target = metrikaWindow();
  disableCounter(false);
  if (started) {
    if (lastPageUrl !== pageUrl) { target.ym?.(METRIKA_ID, 'hit', pageUrl); lastPageUrl = pageUrl; }
    return;
  }
  started = true;
  target.ym ??= ((...args: unknown[]) => {
    const queue = target.ym as QueuedYm;
    (queue.a ??= []).push(args);
  }) as QueuedYm;
  (target.ym as QueuedYm).l ??= Date.now();
  target.ym(METRIKA_ID, 'init', {
    defer: true, clickmap: false, webvisor: false, trackLinks: false,
    ecommerce: false, trackHash: false,
    accurateTrackBounce: false, sendTitle: false,
  });
  // URL содержит только допустимые рекламные метки; остальные параметры и фрагмент удалены.
  target.ym(METRIKA_ID, 'hit', pageUrl);
  lastPageUrl = pageUrl;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
  script.dataset.ianepMetrika = 'true';
  document.head.appendChild(script);
}

export function trackNewBrief(responseStatus: number, data: unknown) {
  if (typeof window === 'undefined' || !started || !safePageUrl() || analyticsChoice() !== 'allowed' || responseStatus !== 201) return;
  if (!data || typeof data !== 'object') return;
  const result = data as { id?: unknown; replaced?: unknown };
  if (result.replaced !== false || typeof result.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.id)) return;
  metrikaWindow().ym?.(METRIKA_ID, 'reachGoal', 'brief_created');
}
