import { ThemeProgressiveImage } from "@/components/ui";
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
          <ThemeProgressiveImage
            className={styles.visualImage}
            light={{
              src: `/images/responsive/services/${service.id}-light-1200.webp`,
              srcSet: `/images/responsive/services/${service.id}-light-828.webp 828w, /images/responsive/services/${service.id}-light-1200.webp 1200w`,
            }}
            dark={{
              src: `/images/responsive/services/${service.id}-dark-1200.webp`,
              srcSet: `/images/responsive/services/${service.id}-dark-828.webp 828w, /images/responsive/services/${service.id}-dark-1200.webp 1200w`,
            }}
            alt=""
            fill
            sizes="(max-width: 48rem) 90vw, (max-width: 75rem) 46vw, 55vw"
          />
        </div>
      </article>
    </li>
  );
}
