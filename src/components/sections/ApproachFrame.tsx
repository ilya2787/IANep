import Image from "next/image";
import type { ApproachStep } from "./approach.data";
import styles from "./Approach.module.css";

type ApproachFrameProps = {
  step: ApproachStep;
  isLast: boolean;
};

export function ApproachFrame({ step, isLast }: ApproachFrameProps) {
  const titleId = `approach-step-${step.id}`;

  return (
    <li
      data-reveal className={styles.step}
      aria-labelledby={titleId}
      data-approach-step={step.id}
      data-motion-node={`approach-${step.id}`}
    >
      <article className={styles.frame}>
        <header className={styles.stepHeader}>
          <span className={styles.number} aria-hidden="true">
            {step.number}
          </span>
          <h3 className={styles.stepTitle} id={titleId}>
            {step.title}
          </h3>
          {!isLast && <span data-motion-line className={styles.connector} aria-hidden="true" />}
        </header>

        <p className={styles.description}>{step.description}</p>
        <div className={styles.visual}>
          <Image
            className={`${styles.visualImage} ${styles.lightImage}`}
            src={step.imageLight}
            alt=""
            fill
            quality={82}
            sizes="(max-width: 48rem) 86vw, (max-width: 64rem) 44vw, 28vw"
          />
          <Image
            className={`${styles.visualImage} ${styles.darkImage}`}
            src={step.imageDark}
            alt=""
            fill
            quality={82}
            sizes="(max-width: 48rem) 86vw, (max-width: 64rem) 44vw, 28vw"
          />
        </div>
      </article>
    </li>
  );
}
