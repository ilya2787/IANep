"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link } from "./Link";
import { isHomeSectionHref, navigateToSection, sectionIdFromHref } from "@/lib/section-navigation";

type SectionLinkProps = ComponentProps<typeof Link>;

export function SectionLink({ href, onClick, ...props }: SectionLinkProps) {
  const hrefString = typeof href === "string" ? href : "";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.location.pathname !== "/" || !isHomeSectionHref(hrefString)) return;

    const id = sectionIdFromHref(hrefString);
    if (!id) return;

    event.preventDefault();
    navigateToSection(id, {
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
