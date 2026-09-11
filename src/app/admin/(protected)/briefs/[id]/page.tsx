import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefAnswersView } from "@/app/admin/brief-answers";
import { auditEventLabel, formatAdminDate, formatBriefContact, projectTypeLabel, sourceLabel, statusLabels } from "@/app/admin/brief-presenter";
import styles from "@/app/admin/admin.module.css";
import { briefService } from "@/server/brief/brief.service";
import { prisma } from "@/server/db/prisma";
import { StatusForm } from "@/app/admin/status-form";

type BriefPageProps = { params: Promise<{ id: string }> };

export default async function BriefPage({ params }: BriefPageProps) {
  const { id } = await params;
  const brief = await briefService.getForAdmin(id);
  if (!brief) notFound();
  const clients = await prisma.clientUser.findMany({ where: { active: true }, select: { id: true, name: true, username: true }, orderBy: { name: "asc" } });
  const history = await briefService.getHistoryForAdmin(id);

  return (
    <article>
      <Link className={styles.backLink} href="/admin">← Все заявки</Link>
      <div className={styles.detailHeading}>
        <div><p className={styles.eyebrow}>Заявка № {brief.number}</p><h1 className={styles.pageTitle}>{brief.name}</h1></div>
        <span className={`${styles.status} ${styles[`status_${brief.status}`]}`}>{statusLabels[brief.status]}</span>
      </div>

      <section className={styles.summary} aria-label="Основные данные заявки">
        <div><span>Контакт</span><strong>{formatBriefContact(brief.contact, brief.contactType)}</strong></div>
        <div><span>Тип проекта</span><strong>{projectTypeLabel(brief.projectType)}</strong></div>
        <div><span>Источник</span><strong>{sourceLabel(brief.source)}</strong></div>
        <div><span>Получена</span><strong><time dateTime={brief.createdAt.toISOString()}>{formatAdminDate(brief.createdAt)}</time></strong></div>
      </section>

      {brief.project && <section className={styles.linkedProject}><div><strong>Проект по этой заявке</strong><p>{brief.project.title}</p></div><Link className={styles.briefLink} href={`/admin/projects/${brief.project.id}`}>Открыть проект →</Link></section>}
      <BriefAnswersView answers={brief.answers} />

      <div className={styles.detailColumns}>
        <section className={styles.panel} aria-labelledby="status-title">
          <h2 id="status-title">Работа с заявкой</h2>
          <StatusForm id={brief.id} currentStatus={brief.status} projectId={brief.project?.id} defaultTitle={`${projectTypeLabel(brief.projectType)} · ${brief.name}`} defaultUsername={`client-${brief.number}`} clients={clients} />
        </section>
        <section className={styles.panel} aria-labelledby="history-title">
          <h2 id="history-title">История</h2>
          {history.length ? <ol className={styles.timeline}>{history.map((event) => (
            <li key={event.id}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <div><strong>{auditEventLabel(event.eventType)}</strong>
                {event.previousStatus && event.newStatus && event.previousStatus in statusLabels && event.newStatus in statusLabels ? <p>{statusLabels[event.previousStatus as keyof typeof statusLabels]} → {statusLabels[event.newStatus as keyof typeof statusLabels]}</p> : event.source ? <p>{sourceLabel(event.source)}</p> : null}
                <time dateTime={event.createdAt.toISOString()}>{formatAdminDate(event.createdAt)}</time>
              </div>
            </li>
          ))}</ol> : <p className={styles.muted}>Событий пока нет.</p>}
        </section>
      </div>
    </article>
  );
}
