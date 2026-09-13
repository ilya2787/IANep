import Link from "next/link";
import { requireClient } from "@/server/client/auth";
import { listNotifications, unreadCount } from "@/server/notifications/service";
import { readAllClientNotifications, readNotification } from "@/app/client/actions";
import { timeLabel } from "@/server/client/model";
import { NotificationPagination } from "@/components/workspace/NotificationPagination";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Уведомления · Кабинет клиента" };
export default async function ClientNotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const client = await requireClient();
  const requestedPage = Number((await searchParams).page);
  const [result, unread] = await Promise.all([listNotifications({ clientId: client.id }, requestedPage), unreadCount({ clientId: client.id })]);
  return <div className={s.stack}><div className={s.row}><div><p className={s.muted}>Кабинет клиента</p><h1>Уведомления</h1></div>{unread > 0 && <form action={readAllClientNotifications}><button className={s.notificationButton} type="submit">Прочитать всё</button></form>}</div>{result.items.length ? <><div className={s.notificationList}>{result.items.map(item => <article key={item.id} className={`${s.notification} ${item.readAt ? "" : s.notificationUnread}`}><div className={s.stack}><div className={s.row}><h2>{item.title}</h2><time className={s.muted}>{timeLabel(item.createdAt)}</time></div><p>{item.message}</p><div className={s.row}>{item.href ? <Link href={item.href}>Перейти к событию →</Link> : <span />}{!item.readAt && <form action={readNotification.bind(null, item.id)}><button className={s.notificationButton} type="submit">Отметить прочитанным</button></form>}</div></div></article>)}</div><NotificationPagination basePath="/client/notifications" page={result.page} pages={result.pages} /></> : <section className={s.panel}><h2>Пока тихо</h2><p className={s.muted}>Здесь появятся только важные изменения по вашим проектам.</p></section>}</div>;
}
