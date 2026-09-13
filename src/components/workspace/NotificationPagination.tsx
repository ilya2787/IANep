import Link from "next/link";
import s from "@/components/workspace/workspace.module.css";

type NotificationPaginationProps = {
  basePath: "/admin/notifications" | "/client/notifications";
  page: number;
  pages: number;
};

export function NotificationPagination({ basePath, page, pages }: NotificationPaginationProps) {
  if (pages <= 1) return null;
  const pageHref = (target: number) => target === 1 ? basePath : `${basePath}?page=${target}`;
  const startPage = Math.min(Math.max(1, page - 2), Math.max(1, pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, index) => startPage + index);
  const previousDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return <nav className={s.pagination} aria-label="Пагинация уведомлений">
    <Link className={`${s.pageButton} ${previousDisabled ? s.pageButtonDisabled : ""}`} href={pageHref(previousDisabled ? 1 : page - 1)} aria-disabled={previousDisabled} tabIndex={previousDisabled ? -1 : undefined}>← Назад</Link>
    <div className={s.pageNumbers}>
      {pageNumbers.map(pageNumber => <Link key={pageNumber} className={`${s.pageNumber} ${pageNumber === page ? s.pageNumberActive : ""}`} href={pageHref(pageNumber)} aria-current={pageNumber === page ? "page" : undefined} aria-label={`Страница ${pageNumber}`}>{pageNumber}</Link>)}
    </div>
    <span className={s.mobilePageStatus} aria-live="polite">Страница {page} из {pages}</span>
    <Link className={`${s.pageButton} ${nextDisabled ? s.pageButtonDisabled : ""}`} href={pageHref(nextDisabled ? pages : page + 1)} aria-disabled={nextDisabled} tabIndex={nextDisabled ? -1 : undefined}>Далее →</Link>
  </nav>;
}
