"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cleanHomeUrl, navigateToSection } from "@/lib/section-navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Server-rendered content stays visible until the motion layer is ready. */
export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let secondFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (!target) return;

        navigateToSection(id, { behavior: "auto" });
        window.history.replaceState(window.history.state, "", cleanHomeUrl(window.location));
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();

    media.add({
      desktop: "(min-width: 769px)",
      reduced: "(prefers-reduced-motion: reduce)",
      mobile: "(max-width: 768px)",
    }, (context) => {
      if (context.conditions?.reduced) return;
      const desktop = context.conditions?.desktop;
      const entrances = new Map<Element, gsap.core.Animation>();
      const hero = element.querySelector<HTMLElement>("[data-hero]");
      const heroMascot = element.querySelector<HTMLElement>("[data-hero-mascot-motion]");
      const heroEyes = element.querySelector<HTMLElement>("[data-hero-eyes]");
      let removeHeroPointerMotion = () => {};
      if (desktop && hero && heroMascot && heroEyes) {
        const moveEyesX = gsap.quickTo(heroEyes, "x", { duration: 0.28, ease: "power3.out" });
        const moveEyesY = gsap.quickTo(heroEyes, "y", { duration: 0.28, ease: "power3.out" });

        const onPointerMove = (event: PointerEvent) => {
          const heroRect = hero.getBoundingClientRect();
          if (heroRect.bottom < 0 || heroRect.top > window.innerHeight) return;

          const mascotRect = heroMascot.getBoundingClientRect();
          const centerX = mascotRect.left + mascotRect.width * 0.49;
          const centerY = mascotRect.top + mascotRect.height * 0.385;
          const deltaX = event.clientX - centerX;
          const deltaY = event.clientY - centerY;
          const distance = Math.hypot(deltaX, deltaY) || 1;
          const intensity = Math.min(distance / 180, 1);
          const maxX = mascotRect.width * 0.04;
          const maxY = mascotRect.height * 0.021;

          moveEyesX((deltaX / distance) * maxX * intensity);
          moveEyesY((deltaY / distance) * maxY * intensity);
        };
        const resetPointerMotion = () => {
          moveEyesX(0);
          moveEyesY(0);
        };
        const onPointerOut = (event: PointerEvent) => {
          if (!event.relatedTarget) resetPointerMotion();
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerout", onPointerOut, { passive: true });
        window.addEventListener("blur", resetPointerMotion);
        removeHeroPointerMotion = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerout", onPointerOut);
          window.removeEventListener("blur", resetPointerMotion);
        };
      }

      // Observe actual visibility in both scroll directions. One-shot scroll
      // thresholds can be consumed off screen by browser scroll restoration.
      const revealObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const animation = entrances.get(entry.target);
          if (!animation) continue;
          if (entry.isIntersecting) {
            animation.play();
          } else if (!entry.target.contains(document.activeElement)) {
            animation.pause(0);
          }
        }
      }, { threshold: 0, rootMargin: "0px 0px -5% 0px" });

      element.querySelectorAll<HTMLElement>("[data-reveal]").forEach((target) => {
        // Never hide content that was already in or near the viewport when JS became ready.
        if (target.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
        const tween = gsap.fromTo(target, {
          y: desktop ? 36 : 20,
          opacity: 0,
        }, {
          y: 0,
          opacity: 1,
          paused: true,
          duration: 0.85,
          ease: "power3.out",
        });
        entrances.set(target, tween);
        revealObserver.observe(target);
      });

      if (desktop) {
        element.querySelectorAll<HTMLElement>("[data-parallax]").forEach((target) => {
          gsap.to(target, {
            y: Number(target.dataset.parallax),
            ease: "none",
            scrollTrigger: {
              trigger: target.closest("section, article") ?? target,
              start: "clamp(top bottom)",
              end: "clamp(bottom top)",
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
        });
        element.querySelectorAll<HTMLElement>("[data-motion-line]").forEach((target) => {
          gsap.from(target, {
            scaleX: 0, transformOrigin: "left center", duration: 0.8,
            ease: "power2.inOut",
            scrollTrigger: { trigger: target, start: "clamp(top 85%)", once: true },
          });
        });
      }

      // Keyboard navigation must never land on a still-transparent control.
      const onFocus = (event: FocusEvent) => {
        if (!(event.target instanceof Node)) return;
        // Next.js can focus <main> during navigation; that is not user focus
        // inside the animated copy and must not cancel the entrance.
        for (const [target, animation] of entrances) {
          if (target.contains(event.target)) animation.progress(1);
        }
      };
      element.addEventListener("focusin", onFocus);

      // FAQ expansion and brief steps change downstream trigger positions.
      let refreshTimer: ReturnType<typeof setTimeout>;
      const observer = new ResizeObserver(() => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
      });
      observer.observe(element);
      let active = true;
      void document.fonts.ready.then(() => {
        if (active) ScrollTrigger.refresh();
      });

      return () => {
        active = false;
        observer.disconnect();
        revealObserver.disconnect();
        clearTimeout(refreshTimer);
        removeHeroPointerMotion();
        element.removeEventListener("focusin", onFocus);
      };
    });

    return () => media.revert();
  }, { scope: root });

  return <main id="main-content" tabIndex={-1} ref={root}>{children}</main>;
}
