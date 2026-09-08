import { prisma } from "@/server/db/prisma";
import { requireAdmin } from "@/server/auth/admin-auth";
import { manageClient } from "@/app/admin/system/actions";
import { WorkspaceForm } from "@/components/workspace/forms";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Пользователи · Admin" };
export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.clientUser.findMany({ include: { _count: { select: { projects: true, decisions: true, notifications: true } } }, orderBy: { createdAt: "desc" } });
  return <div className={`${s.main} ${s.embedded} ${s.stack}`}><div className={s.intro}><h1>Пользователи</h1><p className={s.muted}>Блокировка завершает активные сессии и сохраняет историю.</p></div>{users.length ? <div className={s.stack}>{users.map(user => { const linked = user._count.projects + user._count.decisions + user._count.notifications; return <article className={`${s.panel} ${s.stack}`} key={user.id}><div className={s.row}><div><h2>{user.name}</h2><p className={s.muted}>{user.username}{user.email ? ` · ${user.email}` : " · e-mail не указан"}</p></div><span className={s.badge}>{user.active ? "Активен" : "Заблокирован"}</span></div><p className={s.muted}>Проектов: {user._count.projects} · решений: {user._count.decisions} · уведомлений: {user._count.notifications}</p><div className={s.inlineActions}><WorkspaceForm action={manageClient.bind(null, user.active ? "deactivate" : "reactivate", user.id)} submit={user.active ? "Заблокировать" : "Восстановить доступ"} tone={user.active ? "danger" : "default"}><p className={s.muted}>{user.active ? "Вход будет закрыт, все сессии завершатся." : "Пользователь снова сможет войти."}</p></WorkspaceForm>{linked === 0 && <WorkspaceForm action={manageClient.bind(null, "delete", user.id)} submit="Удалить ошибочный аккаунт" tone="danger"><p className={s.muted}>Backend повторно проверит все зависимости перед удалением.</p></WorkspaceForm>}</div></article>; })}</div> : <p className={s.panel}>Клиентские аккаунты ещё не создавались.</p>}</div>;
}
