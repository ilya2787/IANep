"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import styles from "./ProjectImageLightbox.module.css";

type Props = {
  src: string;
  alt: string;
  children: ReactNode;
  caption?: string;
  fill?: boolean;
};

export function ImageLightbox({ src, alt, children, caption, fill = false }: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const release = acquireBodyScrollLock();
    const returnFocus = trigger.current;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      release();
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [open, loaded, failed]);

  return <>
    <button ref={trigger} type="button" className={`${styles.trigger} ${fill ? styles.fill : ""}`} onClick={() => { setFailed(false); setLoaded(false); setOpen(true); }} aria-label={`Увеличить изображение: ${caption || alt}`}>
      {children}
    </button>
    {open && createPortal(
      <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={caption || alt}>
          <button ref={closeButton} type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Закрыть изображение">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
          {!failed && !loaded && <p className={styles.loading} role="status">Загружаем изображение…</p>}
          {failed ? <p className={styles.error} role="alert">Не удалось загрузить изображение. Закройте окно и попробуйте ещё раз.</p> : (
            // The source may be a public asset or an authenticated file route.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.image} src={src} alt={alt} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ visibility: loaded ? "visible" : "hidden" }} />
          )}
          {caption && !failed ? <p className={styles.caption}>{caption}</p> : null}
        </div>
      </div>, document.body
    )}
  </>;
}

export const ProjectImageLightbox = ImageLightbox;
