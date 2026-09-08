import Link from "next/link";
import { requireClient } from "@/server/client/auth";
import { logoutClient } from "../actions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import s from "@/components/workspace/workspace.module.css";
import { unreadCount } from "@/server/notifications/service";
export const metadata = { title: "Кабинет клиента", robots: { index: false, follow: false } };
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const unread = await unreadCount({ clientId: client.id });
  return <div className={s.root}><header className={s.header}><Link href="/client" className={s.brand}>IANep</Link><nav className={s.nav} aria-label="Кабинет клиента"><Link href="/client">Мои проекты</Link><Link href="/client/notifications" className={s.notificationLink}>Уведомления{unread > 0 && <span aria-label={`Непрочитанных: ${unread}`}>{unread > 99 ? "99+" : unread}</span>}</Link><Link href="/client/settings">Настройки</Link><ThemeToggle /><form action={logoutClient}><button>Выйти</button></form></nav></header><main id="main-content" className={s.main}>{children}</main></div>;
}
