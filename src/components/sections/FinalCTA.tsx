import Image from "next/image";
import { Container } from "@/components/layout";
import { Button, Link } from "@/components/ui";
import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  return (
    <section
      className={styles.section}
      id="final-cta"
      aria-labelledby="final-cta-title"
      data-motion-section="final-cta"
      data-motion-from="faq"
    >
      <div className={styles.gradient} aria-hidden="true" />
      <Container className={styles.layout}>
        <div data-reveal className={styles.copy}>
          <h2 className={styles.title} id="final-cta-title">
            Обсудим <span>ваш проект?</span>
          </h2>
          <p className={styles.description}>
            Расскажите о своей задаче. Мы предложим подходящее решение и поможем достичь результата.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="#brief" variant="primary">
              Рассчитать проект <span aria-hidden="true">→</span>
            </Link>
            {/* Прямой контакт пока не утверждён. */}
            <Button className={styles.secondary} variant="ghost" disabled>
              Связаться напрямую ↗
            </Button>
          </div>
        </div>
        <div data-reveal className={styles.visual}>
          <div data-parallax="-28" className={styles.brand} data-motion-anchor="final-cta-ian" aria-hidden="true">
            <Image
              className={styles.image}
              src="/reference/brand-symbol.png"
              alt=""
              width={1536}
              height={1024}
              sizes="(max-width: 768px) 92vw, 48vw"
            />
          </div>
          <div className={styles.mascot}>
            <Image
              className={styles.image}
              src="/images/final-cta/mascot-inviting-v3.png"
              alt="Персонаж IANep приглашает обсудить проект, протягивая открытую ладонь"
              width={1024}
              height={1536}
              sizes="(max-width: 768px) 70vw, (max-width: 1440px) 34vw, 480px"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
