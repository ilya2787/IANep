import { Container } from "@/components/layout";
import { ProgressiveImage, SectionLink } from "@/components/ui";
import { ProjectCase } from "./ProjectCase";
import { projects } from "./projects.data";
import styles from "./Projects.module.css";

export function Projects() {
  return (
    <section
      className={styles.projects}
      id="projects"
      aria-labelledby="projects-title"
      data-motion-section="projects"
    >
      <Container>
        <div data-reveal className={styles.intro}>
          <div>
            <h2 className={styles.title} id="projects-title">
              Избранные проекты
            </h2>
            <p className={styles.lead}>
              Реальные задачи, реальные решения и работающие цифровые продукты.
            </p>
          </div>

          <SectionLink className={styles.allProjectsLink} href="#all-projects">
            Смотреть все проекты <span aria-hidden="true">→</span>
          </SectionLink>
        </div>

        <div className={styles.projectList}>
          {projects.map((project) => (
            <ProjectCase key={project.id} project={project} />
          ))}
        </div>

        <div className={styles.portfolioFooter} id="all-projects">
          <div className={styles.portfolioMascot} aria-hidden="true">
            <ProgressiveImage
              className={styles.portfolioMascotImage}
              src="/images/projects/portfolio-mascot-seated-v2.png"
              alt=""
              fill
              sizes="(max-width: 768px) 8rem, 10rem"
            />
          </div>
          <div className={styles.portfolioFooterCopy}>
            <h3>Больше кейсов и деталей в полном портфолио</h3>
            <p>Каждый проект показывает решение конкретной задачи.</p>
          </div>
          <SectionLink className={styles.footerLink} href="#projects">
            Смотреть все проекты <span aria-hidden="true">→</span>
          </SectionLink>
        </div>
      </Container>
    </section>
  );
}
