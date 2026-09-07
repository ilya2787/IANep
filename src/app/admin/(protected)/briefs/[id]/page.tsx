import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefAnswersView } from "@/app/admin/brief-answers";
import { auditEventLabel, formatAdminDate, projectTypeLabel, sourceLabel, statusLabels } from "@/app/admin/brief-presenter";
import styles from "@/app/admin/admin.module.css";
import { briefService } from "@/server/brief/brief.service";
import { StatusForm } from "@/app/admin/status-form";

type BriefPageProps = { params: Promise<{ id: string }> };

export default async function BriefPage({ params }: BriefPageProps) {
  const { id } = await params;
  const brief = await briefService.getForAdmin(id);
  if (!brief) notFound();
  const history = await briefService.getHistoryForAdmin(id);

  return (
    <article>
      <Link className={styles.backLink} href="/admin">← Все заявки</Link>
      <div className={styles.detailHeading}>
        <div><p className={styles.eyebrow}>Заявка № {brief.number}</p><h1 className={styles.pageTitle}>{brief.name}</h1></div>
        <span className={`${styles.status} ${styles[`status_${brief.status}`]}`}>{statusLabels[brief.status]}</span>
      </div>

      <section className={styles.summary} aria-label="Основные данные заявки">
        <div><span>Контакт</span><strong>{brief.contact}</strong></div>
        <div><span>Тип проекта</span><strong>{projectTypeLabel(brief.projectType)}</strong></div>
        <div><span>Источник</span><strong>{sourceLabel(brief.source)}</strong></div>
        <div><span>Получена</span><strong><time dateTime={brief.createdAt.toISOString()}>{formatAdminDate(brief.createdAt)}</time></strong></div>
      </section>

      <BriefAnswersView answers={brief.answers} />

      <div className={styles.detailColumns}>
        <section className={styles.panel} aria-labelledby="status-title">
          <h2 id="status-title">Работа с заявкой</h2>
          <StatusForm key={brief.status} id={brief.id} currentStatus={brief.status} />
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
