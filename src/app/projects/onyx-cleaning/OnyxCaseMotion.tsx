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

      gsap.utils.toArray<HTMLElement>("[data-case-reveal]").forEach((target) => {
        if (target.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
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
