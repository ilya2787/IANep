import { prisma } from "@/server/db/prisma";
import { requireOwner } from "@/server/auth/admin-auth";
import { createOperator, manageOperator, deleteOperator } from "@/app/admin/staff/actions";
import { WorkspaceForm } from "@/components/workspace/forms";
import s from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Сотрудники · IANep" };

export default async function StaffPage() {
  await requireOwner();
  const operators = await prisma.adminUser.findMany({ where: { role: "operator" }, select: { id: true, username: true, active: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return <div className={`${s.main} ${s.embedded} ${s.stack}`}>
    <div className={s.intro}><h1>Сотрудники</h1><p className={s.muted}>Операторы работают со всеми заявками и проектами. Настройки системы и опасные действия доступны только владельцу.</p></div>
    <section className={`${s.panel} ${s.stack}`}><h2>Новый оператор</h2><WorkspaceForm action={createOperator} submit="Создать оператора"><label>Логин<input name="username" required minLength={3} maxLength={100} pattern="[a-zA-Z0-9._@+\-]{3,100}" autoComplete="off" /></label><label>Временный пароль<input name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label><p className={s.muted}>Пароль виден только при вводе. Передайте его сотруднику защищённым способом.</p></WorkspaceForm></section>
    <section className={s.stack} aria-label="Операторы"><h2>Операторы</h2>{operators.length ? operators.map(operator => <article className={`${s.panel} ${s.stack}`} key={operator.id}><div className={s.row}><div><h3>{operator.username}</h3><p className={s.muted}>Создан {operator.createdAt.toLocaleDateString("ru-RU")}</p></div><span className={s.badge}>{operator.active ? "Активен" : "Заблокирован"}</span></div><div className={s.inlineActions}><WorkspaceForm action={manageOperator.bind(null, operator.id, operator.active ? "block" : "unblock")} submit={operator.active ? "Заблокировать" : "Разблокировать"} tone={operator.active ? "danger" : "default"}><span className={s.muted}>Активные сеансы будут закрыты.</span></WorkspaceForm><WorkspaceForm action={manageOperator.bind(null, operator.id, "revoke")} submit="Завершить сеансы"><span className={s.muted}>Потребуется повторный вход.</span></WorkspaceForm></div><details><summary>Сбросить пароль</summary><WorkspaceForm action={manageOperator.bind(null, operator.id, "reset")} submit="Сменить пароль"><label>Новый пароль<input name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label></WorkspaceForm></details><details><summary>Удалить оператора</summary><WorkspaceForm action={deleteOperator.bind(null, operator.id)} submit="Удалить оператора" tone="danger"><div className={s.destructiveWarning}><strong>Необратимое действие</strong><p>Учётная запись {operator.username} и её уведомления будут удалены. Все сеансы закроются. Заявки, проекты и журнал действий сохранятся.</p></div><label className={s.checkbox}><input type="checkbox" name="confirmed" value="yes" required />Подтверждаю необратимое удаление оператора</label><label>Введите «УДАЛИТЬ»<input name="confirmation" required autoComplete="off" pattern="УДАЛИТЬ" /></label></WorkspaceForm></details></article>) : <p className={s.panel}>Операторов пока нет.</p>}</section>
  </div>;
}
