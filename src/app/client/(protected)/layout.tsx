import { requireClient } from "@/server/client/auth";
import { logoutClient } from "../actions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import s from "@/components/workspace/workspace.module.css";
import { unreadCount } from "@/server/notifications/service";
import { ResponsiveWorkspaceHeader } from "@/components/workspace/ResponsiveWorkspaceHeader";
export const metadata = { title: "Кабинет клиента", robots: { index: false, follow: false } };
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const unread = await unreadCount({ clientId: client.id });
  return <div className={s.root}><ResponsiveWorkspaceHeader
    brandHref="/client"
    contextLabel="Личный кабинет"
    navigationLabel="Кабинет клиента"
    unreadCount={unread}
    items={[
      { href: "/client", label: "Мои проекты", matchPrefixes: ["/client", "/client/projects"] },
      { href: "/client/notifications", label: "Уведомления" },
      { href: "/client/settings", label: "Настройки" },
    ]}
    themeControl={<ThemeToggle />}
    logoutControl={<form action={logoutClient}><button type="submit">Выйти</button></form>}
  /><main id="main-content" className={s.main}>{children}</main></div>;
}
