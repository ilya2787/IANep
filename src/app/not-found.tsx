import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Link } from "@/components/ui/Link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

export default function NotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <Link className={styles.logo} href="/" aria-label="IANep, главная">
            <Image
              className={styles.logoMark}
              src="/reference/logo-ia.png"
              alt=""
              width={44}
              height={27}
            />
            <span>Nep</span>
          </Link>
          <ThemeToggle />
        </Container>
      </header>

      <main className={styles.main} id="main-content">
        <Container className={styles.stage}>
          <div className={styles.copy}>
            <h1 className={styles.code}>404</h1>
            <p className={styles.title}>Упс, кажется, здесь пусто</p>
            <p className={styles.description}>
              Такой страницы нет или она переехала.
            </p>
            <Link className={styles.action} href="/" variant="primary">
              Вернуться на главную <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.character}>
            <div className={styles.orbit} aria-hidden="true" />
            <Image
              className={styles.characterImage}
              src="/images/not-found/mascot-thinking-v2.webp"
              alt="Задумчивый фирменный персонаж IANep"
              width={960}
              height={989}
              priority
              fetchPriority="high"
              sizes="(max-width: 47.999rem) 76vw, (max-width: 79.999rem) 46vw, 38rem"
            />
          </div>
        </Container>
      </main>
    </div>
  );
}
