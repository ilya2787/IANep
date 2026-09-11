import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { logoutAdmin } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { requireAdmin } from "@/server/auth/admin-auth";
import { unreadCount } from "@/server/notifications/service";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const unread = await unreadCount({ adminId: admin.adminId });
  return (
    <div className={styles.adminRoot}>
      <header className={styles.shellHeader}>
        <div className={styles.brand}><Link href="/admin" className={styles.brandName}>IANep</Link><span className={styles.brandArea}>/ Администратор</span></div>
        <div className={styles.headerActions}><Link href="/admin">Заявки</Link><Link href="/admin/projects">Проекты</Link><Link href="/admin/users">Пользователи</Link><Link href="/admin/privacy-requests">Персональные данные</Link><Link href="/admin/events">Журнал</Link><Link href="/admin/system">Система</Link><Link href="/admin/notifications" className={styles.notificationLink}>Уведомления{unread > 0 && <span aria-label={`Непрочитанных: ${unread}`}>{unread > 99 ? "99+" : unread}</span>}</Link><ThemeToggle /><form action={logoutAdmin}><button className={styles.logoutButton} type="submit">Выйти</button></form></div>
      </header>
      <main id="main-content" className={styles.shellMain}>{children}</main>
    </div>
  );
}
