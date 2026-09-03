import Image from "next/image";
import { Container, Header } from "@/components/layout";
import { Link } from "@/components/ui";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Header />
      <div className={styles.showcase} aria-label="Примеры интерфейсов, разработанных IANep">
        <div className={styles.showcaseGlow} aria-hidden="true" />
        <div data-hero-brand className={styles.brandSymbol} aria-hidden="true">
          <Image
            className={styles.brandSymbolImage}
            src="/reference/brand-symbol.png"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 95vw, 52vw"
          />
        </div>
        <div className={styles.platform} aria-hidden="true" />
        <div data-hero-mascot className={styles.mascot}>
          <Image
            className={styles.mascotImage}
            src="/images/hero-mascot-v1.png"
            alt="Цифровой помощник IANep работает над сайтом за ноутбуком"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 58vw"
          />
        </div>
      </div>

      <Container className={styles.content}>
        <div data-hero-copy className={styles.copy}>
          <h1 className={styles.title} id="hero-title">
            <span className={styles.titleLine}>
              <span data-hero-title-line className={styles.titleLineInner}>
                Разрабатываем <span className={styles.accent}>сайты</span>
              </span>
            </span>
            {" "}<span className={styles.titleLine}>
              <span data-hero-title-line className={styles.titleLineInner}>под ваш бизнес</span>
            </span>
          </h1>
          <p className={styles.description}>
            Продумываем функционал под задачи
            <br /> и создаём решения, которые помогают расти.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="#brief" variant="primary">
              Рассчитать проект <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryAction} href="#projects">
              Посмотреть работы <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </Container>

    </section>
  );
}
