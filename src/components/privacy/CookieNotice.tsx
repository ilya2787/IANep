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
    {ready && choice !== null && !editing && <button type="button" className={styles.reopen} onClick={() => setEditing(true)}>Настройки cookie</button>}
  </>;
}
