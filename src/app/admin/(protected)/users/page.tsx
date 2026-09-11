import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/admin-auth";
import { manageClient } from "@/app/admin/system/actions";
import { WorkspaceForm } from "@/components/workspace/forms";
import { clientAuditTimeline } from "@/server/security/audit-journal";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Пользователи · Admin" };
const eventLabels: Record<string, string> = { CLIENT_CREATED: "Аккаунт создан", CLIENT_DEACTIVATED: "Доступ заблокирован", CLIENT_REACTIVATED: "Доступ восстановлен", AUTH_SUCCEEDED: "Выполнен вход", SESSION_REVOKED: "Сессия завершена", NOTIFICATION_PREFERENCES_UPDATED: "Настройки уведомлений изменены" };

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.clientUser.findMany({ include: { _count: { select: { projects: true, decisions: true, notifications: true } } }, orderBy: { createdAt: "desc" } });
  const timelines = new Map(await Promise.all(users.map(async user => [user.id, await clientAuditTimeline(user.id)] as const)));
  return <div className={`${s.main} ${s.embedded} ${s.stack}`}><div className={s.intro}><h1>Пользователи</h1><p className={s.muted}>Блокировка завершает активные сессии и сохраняет историю.</p></div>{users.length ? <div className={s.stack}>{users.map(user => { const linked = user._count.projects + user._count.decisions + user._count.notifications; const history = timelines.get(user.id) ?? []; return <article className={`${s.panel} ${s.stack}`} key={user.id}><div className={s.row}><div><h2>{user.name}</h2><p className={s.muted}>{user.username}{user.email ? ` · ${user.email}` : " · e-mail не указан"}</p></div><span className={s.badge}>{user.active ? "Активен" : "Заблокирован"}</span></div><p className={s.muted}>Проектов: {user._count.projects} · решений: {user._count.decisions} · уведомлений: {user._count.notifications}</p>{history.length > 0 && <details><summary>Последние события клиента</summary><div className={s.history}>{history.map(event => <article key={event.id}><strong>{eventLabels[event.eventType] ?? event.eventType}</strong><p className={s.muted}>{event.createdAt.toLocaleString("ru-RU")}</p></article>)}</div></details>}<div className={s.inlineActions}><WorkspaceForm action={manageClient.bind(null, user.active ? "deactivate" : "reactivate", user.id)} submit={user.active ? "Заблокировать" : "Восстановить доступ"} tone={user.active ? "danger" : "default"}><p className={s.muted}>{user.active ? "Вход будет закрыт, все сессии завершатся." : "Пользователь снова сможет войти."}</p></WorkspaceForm>{linked === 0 && <WorkspaceForm action={manageClient.bind(null, "delete", user.id)} submit="Удалить ошибочный аккаунт" tone="danger"><p className={s.muted}>Backend повторно проверит все зависимости перед удалением.</p></WorkspaceForm>}</div></article>; })}</div> : <p className={s.panel}>Клиентские аккаунты ещё не создавались.</p>}</div>;
}
