"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function OnyxCaseMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!root.current) return;
    const media = gsap.matchMedia();

    media.add({
      desktop: "(min-width: 769px)",
      mobile: "(max-width: 768px)",
      reduced: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      if (context.conditions?.reduced) return;
      const desktop = context.conditions?.desktop;

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro.from("[data-case-hero-copy] > *", { y: 28, autoAlpha: 0, duration: 0.8, stagger: 0.1 })
        .from("[data-hero-frame]", { y: 54, scale: 0.975, autoAlpha: 0, duration: 1.05 }, 0.12);

      gsap.utils.toArray<HTMLElement>("[data-case-reveal]").forEach((target) => {
        gsap.from(target, {
          y: desktop ? 44 : 22,
          autoAlpha: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: target, start: "clamp(top 86%)", once: true },
        });
      });

      if (desktop) {
        const calc = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: "[data-calculator-stage]",
            start: "top 12%",
            end: "+=1600",
            pin: true,
            scrub: 0.8,
          },
        });
        calc.to("[data-calc-screen]", { xPercent: -12, scale: 0.91, autoAlpha: 0.36, duration: 1 })
          .fromTo("[data-order-screen]", { xPercent: 22, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1 }, 0.2)
          .fromTo("[data-mobile-screen]", { yPercent: 20, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.65 }, 0.68);

        gsap.timeline({
          scrollTrigger: { trigger: "[data-order-summary]", start: "top 72%", end: "center 45%", scrub: 0.7 },
        }).from("[data-order-summary]", { xPercent: -9, autoAlpha: 0 })
          .from("[data-delivery-line]", { scaleX: 0, transformOrigin: "left center" }, 0.28)
          .from("[data-telegram-frame]", { xPercent: 12, autoAlpha: 0 }, 0.5);

        gsap.from("[data-admin-detail]", {
          xPercent: 12, yPercent: 12, autoAlpha: 0,
          scrollTrigger: { trigger: "[data-admin-main]", start: "top 55%", end: "center 38%", scrub: 0.6 },
        });
      } else {
        gsap.utils.toArray<HTMLElement>("[data-mobile-screen], [data-telegram-frame], [data-admin-detail]").forEach((target) => {
          gsap.from(target, {
            y: 22, autoAlpha: 0, duration: 0.75, ease: "power3.out",
            scrollTrigger: { trigger: target, start: "clamp(top 86%)", once: true },
          });
        });
      }

      let active = true;
      void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
      return () => { active = false; };
    });

    return () => media.revert();
  }, { scope: root });

  return <div ref={root}>{children}</div>;
}
