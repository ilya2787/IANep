export const sectionNavigationEvent = "ianep:section-navigation";

export function sectionIdFromHref(href: string) {
  const hashIndex = href.indexOf("#");
  return hashIndex >= 0 ? decodeURIComponent(href.slice(hashIndex + 1)) : "";
}

export function isHomeSectionHref(href: string) {
  return href.startsWith("#") || href.startsWith("/#");
}

export function cleanHomeUrl(location: Pick<Location, "pathname" | "search">) {
  return location.pathname === "/" ? `/${location.search}` : location.pathname + location.search;
}

export function focusSection(target: HTMLElement) {
  const focusTarget = target.matches("[tabindex], h1, h2, h3")
    ? target
    : target.querySelector<HTMLElement>("[data-section-focus], h1, h2, h3");

  if (!focusTarget) return;
  if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
}

export function navigateToSection(id: string, { behavior = "smooth" }: { behavior?: ScrollBehavior } = {}) {
  const target = document.getElementById(id);
  if (!target) return false;

  window.dispatchEvent(new CustomEvent(sectionNavigationEvent, { detail: { id } }));

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const currentTarget = document.getElementById(id);
      if (!currentTarget) return;
      currentTarget.scrollIntoView({ block: "start", behavior });
      focusSection(currentTarget);
    });
  });

  return true;
}
