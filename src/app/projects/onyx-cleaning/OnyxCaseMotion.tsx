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

      let active = true;
      void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
      return () => { active = false; };
    });

    return () => media.revert();
  }, { scope: root });

  return <div ref={root}>{children}</div>;
}
