import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ResponsiveWorkspaceHeader } from "@/components/workspace/ResponsiveWorkspaceHeader";
import { logoutAdmin } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { requireAdmin } from "@/server/auth/admin-auth";
import { unreadCount } from "@/server/notifications/service";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const unread = await unreadCount({ adminId: admin.adminId });
  return (
    <div className={styles.adminRoot}>
      <ResponsiveWorkspaceHeader
        brandHref="/admin"
        contextLabel="Администратор"
        navigationLabel="Навигация администратора"
        unreadCount={unread}
        items={[
          { href: "/admin", label: "Заявки", matchPrefixes: ["/admin", "/admin/briefs"] },
          { href: "/admin/projects", label: "Проекты" },
          { href: "/admin/users", label: "Пользователи" },
          { href: "/admin/privacy-requests", label: "Персональные данные" },
          { href: "/admin/events", label: "Журнал" },
          { href: "/admin/system", label: "Система" },
          { href: "/admin/notifications", label: "Уведомления" },
        ]}
        themeControl={<ThemeToggle />}
        logoutControl={<form action={logoutAdmin}><button type="submit">Выйти</button></form>}
      />
      <main id="main-content" className={styles.shellMain}>{children}</main>
    </div>
  );
}
