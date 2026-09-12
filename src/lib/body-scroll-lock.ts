export type ScrollLockEnvironment = {
  document: Document;
  window: Window;
};

const owners = new Set<symbol>();
let restoreLock: (() => void) | null = null;

function lockPage({ document, window }: ScrollLockEnvironment) {
  const html = document.documentElement;
  const body = document.body;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
  const computedPaddingRight = window.getComputedStyle(body).paddingRight;
  const bodyStyles = body.style.cssText;
  const htmlStyles = html.style.cssText;
  const visualViewport = window.visualViewport;

  const updateViewportHeight = () => {
    const height = visualViewport?.height ?? window.innerHeight;
    html.style.setProperty("--modal-viewport-height", `${height}px`);
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.style.setProperty("--body-scrollbar-width", `${scrollbarWidth}px`);
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `${-scrollY}px`;
  body.style.left = `${-scrollX}px`;
  body.style.right = "0";
  body.style.width = "100%";
  if (scrollbarWidth > 0) body.style.paddingRight = `calc(${computedPaddingRight} + ${scrollbarWidth}px)`;
  updateViewportHeight();
  visualViewport?.addEventListener("resize", updateViewportHeight);

  return () => {
    visualViewport?.removeEventListener("resize", updateViewportHeight);
    body.style.cssText = bodyStyles;
    html.style.cssText = htmlStyles;
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
  };
}

function browserEnvironment(): ScrollLockEnvironment | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  return { document, window };
}

export function acquireBodyScrollLock(environment = browserEnvironment()) {
  if (!environment) return () => {};
  const owner = Symbol("body-scroll-lock");
  owners.add(owner);
  if (owners.size === 1) restoreLock = lockPage(environment);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners.delete(owner);
    if (owners.size > 0) return;
    restoreLock?.();
    restoreLock = null;
  };
}

export function getBodyScrollLockCount() {
  return owners.size;
}

export function resetBodyScrollLockForTests() {
  owners.clear();
  restoreLock?.();
  restoreLock = null;
}
