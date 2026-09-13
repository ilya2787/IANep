import Link from "next/link";
import s from "@/components/workspace/workspace.module.css";

type CleanupPaginationProps = {
  page: number;
  pages: number;
  pageParam: "projectPage" | "briefPage";
  otherPage: number;
  otherPageParam: "projectPage" | "briefPage";
  label: string;
};

export function CleanupPagination({ page, pages, pageParam, otherPage, otherPageParam, label }: CleanupPaginationProps) {
  if (pages <= 1) return null;
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (target > 1) params.set(pageParam, String(target));
    if (otherPage > 1) params.set(otherPageParam, String(otherPage));
    const query = params.toString();
    return query ? `/admin/system?${query}` : "/admin/system";
  };
  const previousDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return <nav className={s.pagination} aria-label={label}>
    <Link className={`${s.pageButton} ${previousDisabled ? s.pageButtonDisabled : ""}`} href={pageHref(previousDisabled ? 1 : page - 1)} aria-disabled={previousDisabled} tabIndex={previousDisabled ? -1 : undefined}>← Назад</Link>
    <span className={s.pageNumbers} aria-live="polite">Страница {page} из {pages}</span>
    <Link className={`${s.pageButton} ${nextDisabled ? s.pageButtonDisabled : ""}`} href={pageHref(nextDisabled ? pages : page + 1)} aria-disabled={nextDisabled} tabIndex={nextDisabled ? -1 : undefined}>Далее →</Link>
  </nav>;
}
