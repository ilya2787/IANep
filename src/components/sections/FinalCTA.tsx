import { Container } from "@/components/layout";
import { ProgressiveImage, SectionLink } from "@/components/ui";
import { ContactDialog } from "./ContactDialog";
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
            <SectionLink className={styles.primary} href="#brief" variant="primary">
              Рассчитать проект <span aria-hidden="true">→</span>
            </SectionLink>
            <ContactDialog />
          </div>
        </div>
        <div data-reveal className={styles.visual}>
          <div data-parallax="-28" className={styles.brand} data-motion-anchor="final-cta-ian" aria-hidden="true">
            <ProgressiveImage
              className={styles.image}
              src="/images/responsive/final-cta/brand-symbol-1080.webp"
              staticSrcSet="/images/responsive/final-cta/brand-symbol-640.webp 640w, /images/responsive/final-cta/brand-symbol-1080.webp 1080w"
              alt=""
              width={1536}
              height={1024}
              sizes="(max-width: 768px) 92vw, 48vw"
              unoptimized
            />
          </div>
          <div className={styles.mascot}>
            <ProgressiveImage
              className={styles.image}
              src="/images/responsive/final-cta/mascot-1080.webp"
              staticSrcSet="/images/responsive/final-cta/mascot-640.webp 640w, /images/responsive/final-cta/mascot-1080.webp 1080w"
              alt="Персонаж IANep приглашает обсудить проект, протягивая открытую ладонь"
              width={1024}
              height={1536}
              sizes="(max-width: 768px) 70vw, (max-width: 1440px) 34vw, 480px"
              unoptimized
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
