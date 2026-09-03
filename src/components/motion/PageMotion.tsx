"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Server-rendered content stays visible until the motion layer is ready. */
export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

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
      const select = gsap.utils.selector(element);
      const entrances = new Map<Element, gsap.core.Animation>();
      const heroCopy = element.querySelector<HTMLElement>("[data-hero-copy]");
      // Start when the hero is visible, including after returning from an anchor.
      // A URL hash or restored scroll position must not permanently skip the intro.
      const intro = gsap.timeline({
        paused: true,
        defaults: { duration: 0.9, ease: "power3.out" },
      });
      const heroObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          intro.play();
        } else {
          // Anchor restoration may move past the hero just after hydration.
          // Keep the intro ready instead of letting it finish off screen.
          intro.pause(0);
        }
      }, { threshold: 0.15 });

      if (heroCopy) {
        intro
          .from(select("[data-hero-title-line]"), {
            yPercent: 115,
            rotation: desktop ? 2 : 0,
            transformOrigin: "left bottom",
            duration: 1.15,
            stagger: 0.18,
            ease: "power4.out",
            clearProps: "transform,transformOrigin",
          }, 0.1)
          .from(select("[data-hero-copy] > p"), {
            y: 20, opacity: 0, duration: 0.85,
            clearProps: "transform,opacity",
          }, 0.5)
          .from(select("[data-hero-copy] > div > a"), {
            y: 16, opacity: 0, duration: 0.7, stagger: 0.1,
            clearProps: "transform,opacity",
          }, 0.7)
          .from(select("[data-hero-mascot]"), {
            y: 42, scale: 0.96, opacity: 0, duration: 1.2,
            clearProps: "transform,opacity",
          }, 0.12)
          .from(select("[data-hero-brand]"), {
            scale: 0.9, opacity: 0, duration: 1.4,
            clearProps: "transform,opacity",
          }, 0.2);
      }

      if (heroCopy) heroObserver.observe(heroCopy);

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
        if (event.target instanceof Element && event.target.closest("[data-hero-copy] a, [data-hero-copy] button")) intro.progress(1);
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
        heroObserver.disconnect();
        revealObserver.disconnect();
        clearTimeout(refreshTimer);
        element.removeEventListener("focusin", onFocus);
      };
    });

    return () => media.revert();
  }, { scope: root });

  return <main id="main-content" tabIndex={-1} ref={root}>{children}</main>;
}
