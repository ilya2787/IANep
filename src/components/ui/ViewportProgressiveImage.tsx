"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { ProgressiveImage } from "./ProgressiveImage";
import styles from "./ProgressiveImage.module.css";

type Props = ComponentProps<typeof ProgressiveImage> & {
  rootMargin?: string;
};

export function ViewportProgressiveImage({ rootMargin = "800px 0px", ...props }: Props) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || requested) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setRequested(true);
      observer.disconnect();
    }, { rootMargin });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [requested, rootMargin]);

  return (
    <>
      <span ref={triggerRef} className={styles.viewportTrigger} aria-hidden="true" />
      {requested ? <ProgressiveImage {...props} /> : null}
    </>
  );
}
