import { Container } from "@/components/layout";
import { FAQAccordion } from "./FAQAccordion";
import { faqIntro, faqItems } from "./faq.data";
import styles from "./FAQ.module.css";

export function FAQ() {
  return (
    <section
      className={styles.faq}
      id="faq"
      aria-labelledby="faq-title"
      data-motion-section="faq"
      data-motion-from="brief"
      data-motion-to="final-cta"
    >
      <Container className={styles.layout}>
        <header data-reveal className={styles.intro}>
          <h2 className={styles.title} id="faq-title">
            Частые вопросы
          </h2>
          <p className={styles.description}>{faqIntro.description}</p>

        </header>
        <FAQAccordion items={faqItems} />
      </Container>
    </section>
  );
}
