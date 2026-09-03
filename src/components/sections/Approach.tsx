import { Container } from "@/components/layout";
import { ApproachFrame } from "./ApproachFrame";
import { approachSteps } from "./approach.data";
import styles from "./Approach.module.css";

export function Approach() {
  return (
    <section
      className={styles.approach}
      id="approach"
      aria-labelledby="approach-title"
      data-motion-section="approach"
      data-motion-from="project-pass-system"
      data-motion-to="brief"
    >
      <Container>
        <div data-reveal className={styles.intro}>
          <h2 className={styles.title} id="approach-title">
            От идеи до запуска
          </h2>
          <p className={styles.subtitle}>
            Чёткий процесс, прозрачная коммуникация и внимание к деталям на
            каждом этапе.
          </p>
        </div>

        <ol className={styles.steps} aria-label="Этапы подхода к проекту">
          {approachSteps.map((step, index) => (
            <ApproachFrame
              key={step.id}
              step={step}
              isLast={index === approachSteps.length - 1}
            />
          ))}
        </ol>
      </Container>
    </section>
  );
}
