"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Theme } from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

const themeStorageKey = "ianep-theme";
const themeChangeEvent = "ianep-theme-change";

function readSavedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(themeStorageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function getTheme(): Theme {
  const explicitTheme = document.documentElement.dataset.theme;

  if (explicitTheme === "light" || explicitTheme === "dark") {
    return explicitTheme;
  }

  const savedTheme = readSavedTheme();

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => onStoreChange();
  const syncPreference = () => {
    document.documentElement.dataset.theme = readSavedTheme() ?? (mediaQuery.matches ? "dark" : "light");
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) syncPreference();
  };

  window.addEventListener(themeChangeEvent, handleChange);
  mediaQuery.addEventListener("change", syncPreference);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(themeChangeEvent, handleChange);
    mediaQuery.removeEventListener("change", syncPreference);
    window.removeEventListener("storage", handleStorage);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The switch still works when the browser disallows persistent storage.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => "dark");

  useEffect(() => {
    const savedTheme = readSavedTheme();

    if (savedTheme === "light" || savedTheme === "dark") {
      document.documentElement.dataset.theme = savedTheme;
      window.dispatchEvent(new Event(themeChangeEvent));
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
  }

  return (
    <button
      className={`${styles.toggle} ${theme === "light" ? styles.light : styles.dark}`}
      type="button"
      onClick={toggleTheme}
      aria-label={`${theme === "dark" ? "Тёмная" : "Светлая"} тема включена. Переключить тему`}
      aria-pressed={theme === "dark"}
    >
      <span className={styles.thumb} aria-hidden="true" />
      <span className={`${styles.iconWrap} ${styles.sun}`}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`${styles.iconWrap} ${styles.moon}`}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
