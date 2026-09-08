"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changeBriefStatus, type StatusActionState } from "@/app/admin/actions";
import { statusLabels } from "@/app/admin/brief-presenter";
import type { BriefRequestStatus } from "@/generated/prisma/client";
import { Select } from "@/components/ui/fields/Select";
import styles from "@/app/admin/admin.module.css";

const initialState: StatusActionState = { message: "", ok: true };
export function StatusForm({ id, currentStatus, projectId, defaultTitle, defaultUsername, clients }: { id: string; currentStatus: BriefRequestStatus; projectId?: string; defaultTitle: string; defaultUsername: string; clients: { id: string; name: string; username: string }[] }) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [clientId, setClientId] = useState("");
  const [state, formAction, pending] = useActionState(changeBriefStatus.bind(null, id), initialState);
  const linked = projectId || state.projectId;
  const creating = status === "IN_PROGRESS" && !linked;
  return <form action={formAction} className={styles.statusForm}>
    <fieldset disabled={pending} className={styles.workflowFields}>
      <label className={styles.field}>Статус заявки<Select name="status" label="Статус заявки" value={status} onChange={event => setStatus(event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      {creating && <div className={styles.workflowSetup}><h3>Начало проекта</h3><p className={styles.muted}>При сохранении создадим проект и свяжем его с этой заявкой.</p><label className={styles.field}>Название проекта<input className={styles.input} name="title" required defaultValue={defaultTitle} maxLength={200} /></label><label className={styles.field}>Клиентский доступ<Select name="clientId" label="Клиентский доступ" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Создать новый кабинет</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.username}</option>)}</Select></label>{!clientId && <><label className={styles.field}>Логин<input className={styles.input} name="username" defaultValue={defaultUsername} required minLength={3} maxLength={100} autoComplete="off" /></label><label className={styles.field}>Пароль · от 12 символов<input className={styles.input} name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label><p className={styles.muted}>Сохраните данные для входа и передайте клиенту. Автоматическая отправка не подключена.</p></>}</div>}
    </fieldset>
    <button className={styles.button} type="submit" disabled={pending}>{pending ? "Сохраняем…" : creating ? "Взять в работу и создать проект" : "Сохранить статус"}</button>
    {state.message && <p className={state.ok ? styles.success : styles.error} role={state.ok ? "status" : "alert"}>{state.message}</p>}
    {linked && <Link className={styles.briefLink} href={`/admin/projects/${linked}`}>Перейти в проект →</Link>}
  </form>;
}
