"use client";

import { useState } from "react";
import styles from "./FAQ.module.css";

type FAQItem = { id: string; question: string; answer: string };

export function FAQAccordion({ items }: { items: readonly FAQItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={styles.accordion}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const questionId = `faq-${item.id}-question`;
        const answerId = `faq-${item.id}-answer`;

        return (
          <div data-reveal className={styles.item} key={item.id} data-open={isOpen} id={`faq-${item.id}`}>
            <h3 className={styles.question}>
              <button
                className={styles.trigger}
                type="button"
                id={questionId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
              >
                <span>{item.question}</span>
                <span className={styles.indicator} aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
            </h3>
            <div
              className={styles.panel}
              id={answerId}
              role="region"
              aria-labelledby={questionId}
              aria-hidden={!isOpen}
              inert={!isOpen}
            >
              <div className={styles.panelInner}>
                <p className={styles.answer}>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
