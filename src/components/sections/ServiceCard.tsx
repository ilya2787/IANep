import Image from "next/image";
import type { Service } from "./services.data";
import styles from "./Services.module.css";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <li
      data-reveal className={styles.card}
      id={`service-${service.id}`}
      data-motion-anchor={service.motionAnchor}
    >
      <article className={styles.cardContent} aria-labelledby={`service-title-${service.id}`}>
        <div className={styles.cardCopy}>
          <h3 className={styles.cardTitle} id={`service-title-${service.id}`}>
            {service.title}
          </h3>
          <p className={styles.cardDescription}>{service.description}</p>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <Image
            className={`${styles.visualImage} ${styles.lightImage}`}
            src={service.image}
            alt=""
            fill
            quality={90}
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 46vw, 55vw"
          />
          <Image
            className={`${styles.visualImage} ${styles.darkImage}`}
            src={service.imageDark}
            alt=""
            fill
            quality={90}
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 46vw, 55vw"
          />
        </div>
      </article>
    </li>
  );
}
