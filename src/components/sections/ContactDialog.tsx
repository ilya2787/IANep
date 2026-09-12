"use client";

import { useId, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import styles from "./ContactDialog.module.css";

gsap.registerPlugin(useGSAP);

export function ContactDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const openActionRef = useRef<() => void>(() => {});
  const closeActionRef = useRef<() => void>(() => {});
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useBodyScrollLock(isOpen);

  useGSAP((_, contextSafe) => {
    const finishClose = () => {
      const dialog = dialogRef.current;
      if (!dialog?.open) return;
      dialog.close();
      closingRef.current = false;
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    closeActionRef.current = contextSafe!(() => {
      const dialog = dialogRef.current;
      if (!dialog?.open || closingRef.current) return;
      closingRef.current = true;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishClose();
        return;
      }

      gsap.to(panelRef.current, {
        y: 8,
        scale: 0.985,
        autoAlpha: 0,
        duration: 0.16,
        ease: "power2.in",
        onComplete: finishClose,
      });
    });

    openActionRef.current = contextSafe!(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      closingRef.current = false;
      dialog.showModal();
      setIsOpen(true);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(panelRef.current, {
        y: 18,
        scale: 0.975,
        autoAlpha: 0,
      }, {
        y: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.38,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      });
    });

    return () => {
      openActionRef.current = () => {};
      closeActionRef.current = () => {};
    };
  }, { scope: dialogRef });

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => openActionRef.current()}
      >
        Связаться напрямую <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          closeActionRef.current();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeActionRef.current();
        }}
      >
        <div ref={panelRef} className={styles.panel}>
          <button className={styles.close} type="button" aria-label="Закрыть" onClick={() => closeActionRef.current()}>
            <span aria-hidden="true" />
          </button>
          <div className={styles.heading}>
            <h2 id={titleId}>Связаться с нами</h2>
            <p id={descriptionId}>Выберите удобный способ связи.</p>
          </div>
          <div className={styles.channels}>
            <a className={styles.channel} href="mailto:info@ianep.ru">
              <span className={styles.channelIcon} aria-hidden="true">@</span>
              <span className={styles.channelCopy}>
                <strong>Электронная почта</strong>
                <span>info@ianep.ru</span>
              </span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </a>
            <div className={`${styles.channel} ${styles.disabled}`} aria-disabled="true">
              <span className={styles.channelIcon} aria-hidden="true">T</span>
              <span className={styles.channelCopy}>
                <strong>Telegram</strong>
                <span>Официальный контакт готовится</span>
              </span>
              <span className={styles.badge}>Скоро</span>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
