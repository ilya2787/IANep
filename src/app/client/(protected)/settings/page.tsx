import { requireClient } from "@/server/client/auth";
import { prisma } from "@/server/db/prisma";
import { updateClientNotificationSettings } from "@/app/client/actions";
import { WorkspaceForm } from "@/components/workspace/forms";
import s from "@/components/workspace/workspace.module.css";
import Link from "next/link";
import { LEGAL_ROUTES } from "@/config/legal";

export const metadata = { title: "Настройки уведомлений" };
export default async function ClientSettingsPage() {
  const session = await requireClient();
  const client = await prisma.clientUser.findUniqueOrThrow({ where: { id: session.id }, select: { email: true, emailNotificationsEnabled: true } });
  return <div className={s.stack}><div className={s.intro}><h1>Настройки</h1><p className={s.muted}>Уведомления в личном кабинете всегда остаются основным каналом.</p></div><section className={s.panel}><h2>Получать уведомления</h2><WorkspaceForm action={updateClientNotificationSettings} submit="Сохранить настройки"><label>Электронная почта<input name="email" type="email" maxLength={320} defaultValue={client.email ?? ""} autoComplete="email" placeholder="name@example.com" /></label><label className={s.checkbox}><input name="emailNotifications" type="checkbox" value="yes" defaultChecked={client.emailNotificationsEnabled} />Получать важные уведомления по электронной почте</label><p className={s.muted}>Письмо содержит только описание события и защищённую ссылку. Материалы и файлы не прикладываются.</p><p className={s.muted}>Подробнее: <Link href={LEGAL_ROUTES.clientTerms}>правила личного кабинета</Link> и <Link href={LEGAL_ROUTES.privacy}>обработка персональных данных</Link>.</p></WorkspaceForm></section></div>;
}
