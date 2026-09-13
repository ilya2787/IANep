"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getActiveNavigationItem, type WorkspaceNavigationItem } from "./responsive-navigation";
import styles from "./ResponsiveWorkspaceHeader.module.css";

type ResponsiveWorkspaceHeaderProps = {
  brandHref: string;
  contextLabel: string;
  navigationLabel: string;
  items: WorkspaceNavigationItem[];
  unreadCount?: number;
  themeControl: ReactNode;
  logoutControl: ReactNode;
};

export function ResponsiveWorkspaceHeader({
  brandHref,
  contextLabel,
  navigationLabel,
  items,
  unreadCount = 0,
  themeControl,
  logoutControl,
}: ResponsiveWorkspaceHeaderProps) {
  const pathname = usePathname();
  const activeItem = getActiveNavigationItem(pathname, items);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = useId();
  useBodyScrollLock(open);

  function closeMenu({ restoreFocus = true } = {}) {
    dialogRef.current?.close();
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 75rem)");
    const closeAtDesktop = () => {
      if (desktop.matches) closeMenu({ restoreFocus: false });
    };
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  const navigation = (mobile: boolean) => (
    <nav className={mobile ? styles.sheetNavigation : styles.desktopNavigation} aria-label={navigationLabel}>
      {items.map((item) => {
        const active = activeItem?.href === item.href;
        const badge = item.href.endsWith("/notifications") && unreadCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.activeLink : undefined}
            aria-current={active ? "page" : undefined}
            onClick={mobile ? () => closeMenu({ restoreFocus: false }) : undefined}
          >
            <span>{item.label}</span>
            {badge && <span className={styles.badge} aria-label={`Непрочитанных: ${unreadCount}`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Link href={brandHref} className={styles.brand} aria-label={`IANep — ${contextLabel}`}>
          IANep
        </Link>
        <span className={styles.context}>/ {contextLabel}</span>
      </div>

      {navigation(false)}

      <div className={styles.desktopControls}>
        {themeControl}
        {logoutControl}
      </div>

      <div className={styles.compactControls}>
        <span className={styles.currentSection} aria-label={`Текущий раздел: ${activeItem?.label ?? contextLabel}`}>
          {activeItem?.label ?? contextLabel}
        </span>
        {themeControl}
        <button
          ref={triggerRef}
          className={styles.menuTrigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          aria-label="Открыть меню разделов"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      {open && createPortal(
        <dialog
          id={dialogId}
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            closeMenu();
          }}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div className={styles.sheet}>
            <div className={styles.sheetHeader}>
              <div>
                <span className={styles.sheetContext}>{contextLabel}</span>
                <h2 id={titleId}>Разделы</h2>
              </div>
              <button className={styles.closeButton} type="button" aria-label="Закрыть меню" onClick={() => closeMenu()} autoFocus>
                <span aria-hidden="true" />
              </button>
            </div>
            {navigation(true)}
            <div className={styles.sheetFooter}>{logoutControl}</div>
          </div>
        </dialog>,
        document.body,
      )}
    </header>
  );
}
