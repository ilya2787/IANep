"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/ui";
import { Container } from "./Container";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.css";

const navigation = [
  { href: "#services", label: "Услуги" },
  { href: "#projects", label: "Проекты" },
  { href: "#approach", label: "Как работаем" },
  { href: "#faq", label: "FAQ" },
  { href: "#brief", label: "Рассчитать проект" },
];

export function Header({ inverse = false }: { inverse?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 72rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => {
      const shouldFloat = entry.intersectionRatio < 0.995;
      setFloating(shouldFloat);
      if (shouldFloat) setMenuOpen(false);
    }, { threshold: [0.995] });

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={styles.header} data-inverse={inverse && !floating || undefined} data-floating={floating || undefined} onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <Container className={styles.inner}>
        <Link className={styles.logo} href="/" aria-label="IANep, главная">
          <Image
            className={styles.logoMark}
            src="/reference/logo-ia.png"
            alt=""
            width={44}
            height={27}
            priority
          />
          <span className={styles.logoText}>Nep</span>
        </Link>

        <nav className={styles.nav} id="primary-navigation" data-open={menuOpen} aria-label="Основная навигация">
          <ul className={styles.navList}>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link className={styles.navLink} href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <button ref={menuButton} className={styles.menuButton} type="button" aria-controls="primary-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"} onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
          <Link className={styles.cta} href="#brief" variant="primary">
            Рассчитать проект <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </header>
  );
}
