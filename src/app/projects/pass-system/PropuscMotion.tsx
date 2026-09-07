"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function PropuscMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ desktop: "(min-width: 1025px)", tablet: "(min-width: 769px) and (max-width: 1024px)", mobile: "(max-width: 768px)", reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
      if (context.conditions?.reduced) return;
      const desktop = context.conditions?.desktop;
      const mobile = context.conditions?.mobile;
      // The six segments map the actual workflow; no content depends on their completion.
      gsap.from("[data-workflow-line]", {
        scaleX: 0, stagger: 1, duration: 1, ease: "none",
        scrollTrigger: { trigger: "[data-creation]", start: "top 75%", end: "bottom 65%", scrub: .3 },
      });
      if (!mobile) {
        gsap.from("[data-creation-screen]", { scale: .97, transformOrigin: "50% 30%", ease: "none", scrollTrigger: { trigger: "[data-creation]", start: "top 65%", end: "center 50%", scrub: .5 } });
        // Focus the complete real editor without cropping or reconstructing its UI.
        gsap.fromTo("[data-editor-screen]", { scale: .98 }, { scale: desktop ? 1.035 : 1, ease: "none", scrollTrigger: { trigger: "[data-editor]", start: "top 55%", end: "center 35%", scrub: .6 } });
        gsap.from("[data-role]", { x: (index) => index === 0 ? -16 : 16, stagger: .6, ease: "none", scrollTrigger: { trigger: "[data-access]", start: "top 75%", end: "top 20%", scrub: .4 } });
        gsap.from("[data-audit]", { x: 18, ease: "none", scrollTrigger: { trigger: "[data-audit]", start: "top 90%", end: "top 55%", scrub: .4 } });
      }
      gsap.utils.toArray<HTMLElement>("[data-print-step]").forEach((step, index) => {
        gsap.from(step, { x: mobile ? 0 : index === 0 ? -18 : 18, ease: "none", scrollTrigger: { trigger: step, start: "top 90%", end: "top 55%", scrub: .4 } });
      });
      let active = true;
      const refresh = () => { if (active) ScrollTrigger.refresh(); };
      const images = Array.from(root.current?.querySelectorAll("img") ?? []);
      images.forEach((image) => image.addEventListener("load", refresh));
      void document.fonts.ready.then(refresh);
      return () => { active = false; images.forEach((image) => image.removeEventListener("load", refresh)); };
    });
    return () => media.revert();
  }, { scope: root });
  return <div ref={root}>{children}</div>;
}
