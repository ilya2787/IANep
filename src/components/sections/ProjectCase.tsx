import { Link, ProgressiveImage } from "@/components/ui";
import type { Project } from "./projects.data";
import styles from "./Projects.module.css";

type ProjectCaseProps = {
  project: Project;
};

export function ProjectCase({ project }: ProjectCaseProps) {
  const titleId = `project-title-${project.id}`;

  return (
    <article
      className={`${styles.project} ${styles[project.kind]}`}
      id={`project-${project.id}`}
      aria-labelledby={titleId}
      data-project={project.kind}
      data-motion-anchor={project.motionAnchor}
    >
      <div data-reveal className={styles.projectCopy}>
        <div className={styles.projectMeta}>
          <span className={styles.number} aria-hidden="true">
            {project.number}
          </span>
          <span className={styles.type}>{project.type}</span>
        </div>

        <h3 className={styles.projectTitle} id={titleId}>
          {project.title}
        </h3>

        <ol className={styles.steps} aria-label={`Возможности проекта «${project.title}»`}>
          {project.steps.map((step) => (
            <li key={step} data-motion-part={project.kind === "pass-system" ? step : undefined}>
              {step}
            </li>
          ))}
        </ol>

        <p className={styles.description}>{project.description}</p>
        <Link className={styles.caseLink} href={project.href} scroll>
          Смотреть кейс <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div data-reveal className={styles.scene} aria-label={`Интерфейс проекта «${project.title}»`}>
        <div className={styles.deviceCanvas}>
          <div className={styles.mainDevice}>
            <ProgressiveImage
              className={styles.deviceImage}
              src={project.deviceImage}
              alt={project.deviceAlt}
              fill
              sizes="(max-width: 48rem) 92vw, (max-width: 80rem) 62vw, 58vw"
            />
            <div className={styles.mainScreen}>
              <ProgressiveImage
                className={styles.desktopImage}
                src={project.desktopImage}
                alt={project.desktopAlt}
                fill
                sizes="(max-width: 48rem) 62vw, (max-width: 80rem) 48vw, 44vw"
              />
            </div>
          </div>
          <div data-parallax="-36" className={styles.phoneDevice}>
            <ProgressiveImage
              className={styles.phoneImage}
              src="/images/projects/devices/separate/phone.png"
              alt="Фотореалистичный смартфон"
              fill
              sizes="(max-width: 48rem) 24vw, 14vw"
            />
            <div className={styles.phoneScreen}>
              <ProgressiveImage
                className={styles.mobileImage}
                src={project.mobileImage}
                alt={project.mobileAlt}
                fill
                sizes="(max-width: 48rem) 15vw, 9vw"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
