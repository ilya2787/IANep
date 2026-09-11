
import { Select } from "@/components/ui/fields/Select";
import Link from "next/link";
import styles from "@/app/admin/admin.module.css";
import { formatAdminDate, formatBriefContact, projectTypeLabel, sourceLabel, statusLabels } from "@/app/admin/brief-presenter";
import { briefService } from "@/server/brief/brief.service";

export const metadata = { title: "Заявки" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const briefs = await briefService.listForAdmin();

  const { status, q = "" } = await searchParams;
  const activeStatus = status && Object.hasOwn(statusLabels, status) ? status : "ALL";
  const query = q.trim().toLocaleLowerCase("ru");
  const visibleBriefs = briefs.filter((brief) => ((activeStatus === "ALL" && brief.status !== "ARCHIVED") || brief.status === activeStatus) && (!query || [brief.name, brief.contact, String(brief.number), projectTypeLabel(brief.projectType)].some((value) => value.toLocaleLowerCase("ru").includes(query))));

  return (
    <section aria-labelledby="briefs-title">
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>Рабочее пространство</p>
          <h1 id="briefs-title" className={styles.pageTitle}>Заявки</h1>
          <p className={styles.pageDescription}>От первого обращения до начала проекта.</p>
        </div>
        <Link href="/" className={styles.siteLink}>Открыть сайт ↗</Link>
      </div>
      <div className={styles.metrics} aria-label="Сводка по последним 200 заявкам">
        {[['ALL', 'Всего заявок'], ['NEW', 'Новые'], ['IN_REVIEW', 'На рассмотрении'], ['CONTACTED', 'Связались'], ['IN_PROGRESS', 'В работе']].map(([key, label]) => (
          <Link href={key === 'ALL' ? '/admin' : `/admin?status=${key}`} key={key} className={`${styles.metric} ${activeStatus === key ? styles.metricActive : ''}`}>
            <span>{label}</span><strong>{key === 'ALL' ? briefs.length : briefs.filter((brief) => brief.status === key).length}</strong><span className={styles.metricArrow} aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      <div className={styles.listHeading}><h2>Входящие заявки</h2><span>Последние 200 · сначала новые</span></div>
      <form className={styles.filters} method="get" action="/admin">
        <label className={styles.searchField}><span className={styles.srOnly}>Поиск заявок</span><input className={styles.input} type="search" name="q" defaultValue={q} placeholder="Имя, контакт или номер заявки" /></label>
        <label><span className={styles.srOnly}>Фильтр по статусу</span><Select className={styles.input} name="status" defaultValue={activeStatus}><option value="ALL">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></label>
        <button className={styles.button} type="submit">Найти</button>
        {query || activeStatus !== 'ALL' ? <Link className={styles.resetLink} href="/admin">Сбросить</Link> : null}
      </form>
      {visibleBriefs.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Заявка</th><th>Клиент</th><th>Проект</th><th>Статус</th><th>Получена</th></tr></thead>
            <tbody>
              {visibleBriefs.map((brief) => (
                <tr key={brief.id}>
                  <td data-label="Заявка"><Link className={styles.briefLink} href={`/admin/briefs/${brief.id}`}>№ {brief.number}</Link><span className={styles.cellMeta}>{sourceLabel(brief.source)}</span></td>
                  <td data-label="Клиент"><span className={styles.primaryCell}>{brief.name}</span><span className={styles.cellMeta}>{formatBriefContact(brief.contact, brief.contactType)}</span></td>
                  <td data-label="Проект">{brief.project ? <Link className={styles.briefLink} href={`/admin/projects/${brief.project.id}`}>{brief.project.title} →</Link> : projectTypeLabel(brief.projectType)}</td>
                  <td data-label="Статус"><span className={`${styles.status} ${styles[`status_${brief.status}`]}`}>{statusLabels[brief.status]}</span></td>
                  <td data-label="Получена"><time dateTime={brief.createdAt.toISOString()}>{formatAdminDate(brief.createdAt)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}><span className={styles.emptyIcon} aria-hidden="true">↙</span><h2>{briefs.length ? "Ничего не найдено" : "Здесь начинаются новые проекты"}</h2><p>{briefs.length ? "Попробуйте другое имя или измените статус в фильтре." : "Когда клиент заполнит бриф на сайте, его заявка появится здесь."}</p></div>
      )}
    </section>
  );
}
