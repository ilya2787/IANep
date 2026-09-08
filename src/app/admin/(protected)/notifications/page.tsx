import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin-auth";
import { listNotifications } from "@/server/notifications/service";
import { readAdminNotification, readAllAdminNotifications } from "@/app/client/actions";
import { timeLabel } from "@/server/client/model";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Уведомления · Admin" };
export default async function AdminNotificationsPage() {
  const admin = await requireAdmin();
  const notifications = await listNotifications({ adminId: admin.adminId });
  const unread = notifications.filter(item => !item.readAt).length;
  return <div className={s.stack}><div className={s.row}><div><p className={s.muted}>Администратор</p><h1>Уведомления</h1></div>{unread > 0 && <form action={readAllAdminNotifications}><button className={s.notificationButton} type="submit">Прочитать всё</button></form>}</div>{notifications.length ? <div className={s.notificationList}>{notifications.map(item => <article key={item.id} className={`${s.notification} ${item.readAt ? "" : s.notificationUnread}`}><div className={s.stack}><div className={s.row}><h2>{item.title}</h2><time className={s.muted}>{timeLabel(item.createdAt)}</time></div><p>{item.message}</p><div className={s.row}>{item.href ? <Link href={item.href}>Перейти к событию →</Link> : <span />}{!item.readAt && <form action={readAdminNotification.bind(null, item.id)}><button className={s.notificationButton} type="submit">Отметить прочитанным</button></form>}</div></div></article>)}</div> : <section className={s.panel}><h2>Новых действий клиента нет</h2><p className={s.muted}>Здесь появятся принятия этапов, правки и важные материалы.</p></section>}</div>;
}
