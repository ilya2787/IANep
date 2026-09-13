export const NOTIFICATIONS_PAGE_SIZE = 10;

export function notificationPage(total: number, requestedPage?: number) {
  const pages = Math.max(1, Math.ceil(Math.max(0, total) / NOTIFICATIONS_PAGE_SIZE));
  const safeRequestedPage = Number.isSafeInteger(requestedPage) && (requestedPage ?? 0) > 0 ? requestedPage as number : 1;
  const page = Math.min(safeRequestedPage, pages);
  return { page, pages, pageSize: NOTIFICATIONS_PAGE_SIZE, skip: (page - 1) * NOTIFICATIONS_PAGE_SIZE };
}
