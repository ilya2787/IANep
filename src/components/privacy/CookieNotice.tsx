"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./CookieNotice.module.css";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LEGAL_ROUTES } from "@/config/legal";
import { ANALYTICS_CHANGE_EVENT, analyticsChoice, setAnalyticsChoice, startMetrika, stopMetrika } from "@/lib/metrika";

export function CookieNotice() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const choice = useSyncExternalStore(
    (notify) => {
      const onStorage = () => { if (analyticsChoice() !== 'allowed') stopMetrika(); notify(); };
      window.addEventListener('storage', onStorage);
      window.addEventListener(ANALYTICS_CHANGE_EVENT, notify);
      return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(ANALYTICS_CHANGE_EVENT, notify); };
    },
    analyticsChoice,
    () => null,
  );
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (choice === 'allowed') startMetrika();
  }, [choice, pathname, searchParams]);
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  async function select(value: 'allowed' | 'necessary') {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await setAnalyticsChoice(value);
      setEditing(false);
    } catch {
      setEditing(true);
      setError(true);
    } finally { setPending(false); }
  }
  return <>
    {ready && (choice === null || editing) && <aside className={styles.notice} aria-labelledby="cookie-notice-title" aria-describedby="cookie-notice-description">
      <div className={styles.content}>
        <h2 className={styles.title} id="cookie-notice-title">Аналитика и файлы cookie</h2>
        <p className={styles.description} id="cookie-notice-description">Необходимые данные помогают работе сайта. С вашего разрешения Яндекс Метрика будет собирать статистику посещений и новых заявок. <Link href={LEGAL_ROUTES.cookies}>О файлах cookie</Link> и <Link href={LEGAL_ROUTES.privacy}>об обработке данных</Link>.</p>
        {error && <p role="alert" className={styles.description}>Не удалось записать выбор. Аналитика не включена; повторите действие позже.</p>}
        <div className={styles.actions}>
          <Button className={styles.action} variant="secondary" disabled={pending} onClick={() => void select('necessary')}>Только необходимые</Button>
          <Button className={styles.action} variant="secondary" disabled={pending} onClick={() => void select('allowed')}>Разрешить аналитику</Button>
        </div>
      </div>
    </aside>}
    {ready && choice !== null && !editing && <button type="button" className={styles.reopen} aria-label="Настройки cookie" title="Настройки cookie" onClick={() => setEditing(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 2.5a2.3 2.3 0 0 0 3.15 2.13 2.4 2.4 0 0 0 3.22 3.22A2.3 2.3 0 0 0 20.5 11a2.3 2.3 0 0 0 1 1.9A9.5 9.5 0 1 1 11.1 2.55a2.3 2.3 0 0 0 .9-.05Z" />
        <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="16" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>}
  </>;
}
