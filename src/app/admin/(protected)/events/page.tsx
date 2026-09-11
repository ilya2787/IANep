import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin-auth";
import { journalCategories, listJournal, type JournalCategory } from "@/server/security/audit-journal";
import { journalCategoryLabels, presentAuditEvent } from "@/server/security/audit-presentation";
import { Select } from "@/components/ui/fields/Select";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Журнал событий · Admin" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const category = journalCategories.includes(query.category as JournalCategory) ? query.category as JournalCategory : undefined;
  const from = query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? new Date(`${query.from}T00:00:00Z`) : undefined;
  const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? new Date(`${query.to}T23:59:59.999Z`) : undefined;
  const result = await listJournal({ page: Number(query.page) || 1, category, from, to }, { side: "ADMIN" });
  const pageHref = (page: number) => `/admin/events?${new URLSearchParams(Object.entries({ category: category ?? "", from: query.from ?? "", to: query.to ?? "", page: String(page) }).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`;
  const startPage = Math.min(Math.max(1, result.page - 2), Math.max(1, result.pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, result.pages) }, (_, index) => startPage + index);

  return <div className={`${s.main} ${s.embedded} ${s.stack}`}>
    <div className={s.intro}><h1>Журнал событий</h1><p className={s.muted}>Понятная хронология действий в проектах и контрольных записей. Журнал доступен только администраторам и не редактируется.</p></div>
    <section className={`${s.panel} ${s.journalFilters}`}><form method="get" className={s.form}><div className={s.filterGrid}><label>Категория<Select name="category" defaultValue={category ?? ""} label="Категория"><option value="">Все категории</option>{journalCategories.map(item => <option value={item} key={item}>{journalCategoryLabels[item]}</option>)}</Select></label><label>С даты<input name="from" type="date" defaultValue={query.from ?? ""} /></label><label>По дату<input name="to" type="date" defaultValue={query.to ?? ""} /></label></div><div className={s.formActions}><button className={s.primary}>Показать события</button>{(category || query.from || query.to) && <Link className={s.secondaryButton} href="/admin/events">Сбросить</Link>}</div></form></section>
    <section className={`${s.panel} ${s.stack}`}><div className={s.row}><div><h2>События</h2><p className={s.muted}>Сначала новые · всего {result.total}</p></div><span className={s.badge}>Страница {result.page} из {result.pages}</span></div>
      {result.items.length ? <div className={s.journalList}>{result.items.map(item => { const view = presentAuditEvent(item); return <article className={s.journalItem} key={`${item.source}-${item.id}`}><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleString("ru-RU")}</time><div className={s.journalBody}><div className={s.journalHeading}><span className={s.badge}>{view.category}</span><strong>{view.action}</strong></div><p><span className={s.muted}>Объект:</span> {view.object}</p>{view.details.length > 0 && <p className={s.journalDetails}>{view.details.join(" · ")}</p>}<details className={s.technicalDetails}><summary>Техническая справка</summary><p>{view.source} · идентификатор {view.technicalId}</p></details></div></article>; })}</div> : <div className={s.emptyState}><strong>Событий не найдено</strong><p>Измените период или категорию и повторите поиск.</p></div>}
      <nav className={s.pagination} aria-label="Страницы журнала"><Link className={`${s.pageButton} ${result.page <= 1 ? s.pageButtonDisabled : ""}`} href={result.page > 1 ? pageHref(result.page - 1) : pageHref(1)} aria-disabled={result.page <= 1} tabIndex={result.page <= 1 ? -1 : undefined}>← Назад</Link><div className={s.pageNumbers}>{pageNumbers.map(page => <Link key={page} className={`${s.pageNumber} ${page === result.page ? s.pageNumberActive : ""}`} href={pageHref(page)} aria-current={page === result.page ? "page" : undefined}>{page}</Link>)}</div><Link className={`${s.pageButton} ${result.page >= result.pages ? s.pageButtonDisabled : ""}`} href={result.page < result.pages ? pageHref(result.page + 1) : pageHref(result.pages)} aria-disabled={result.page >= result.pages} tabIndex={result.page >= result.pages ? -1 : undefined}>Далее →</Link></nav>
    </section>
  </div>;
}
