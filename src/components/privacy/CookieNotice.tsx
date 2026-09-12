"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./CookieNotice.module.css";
import Link from "next/link";
import { LEGAL_ROUTES } from "@/config/legal";

const consentStorageKey = "ianep-cookie-notice-acknowledged";
const consentEventName = "ianep-cookie-notice-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(consentEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(consentEventName, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(consentStorageKey) !== "true";
  } catch {
    return true;
  }
}

export function CookieNotice() {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function acknowledge() {
    try {
      window.localStorage.setItem(consentStorageKey, "true");
    } catch {}

    window.dispatchEvent(new Event(consentEventName));
  }

  if (!isVisible) return null;

  return (
    <aside className={styles.notice} aria-label="Уведомление об использовании файлов cookie">
      <div className={styles.content}>
        <h2 className={styles.title}>Мы используем файлы cookie</h2>
        <p className={styles.description}>
          IANep использует только необходимые файлы cookie и хранилище браузера. <Link href={LEGAL_ROUTES.cookies}>Подробнее о файлах cookie</Link>
        </p>
      </div>
      <Button className={styles.action} onClick={acknowledge}>
        Понятно
      </Button>
    </aside>
  );
}
