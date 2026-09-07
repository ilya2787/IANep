"use client";

import { useActionState } from "react";
import { changeBriefStatus, type StatusActionState } from "@/app/admin/actions";
import { statusLabels } from "@/app/admin/brief-presenter";
import type { BriefRequestStatus } from "@/generated/prisma/client";
import styles from "@/app/admin/admin.module.css";

const statuses = Object.keys(statusLabels) as BriefRequestStatus[];
const initialState: StatusActionState = { message: "", ok: true };

export function StatusForm({ id, currentStatus }: { id: string; currentStatus: BriefRequestStatus }) {
  const action = changeBriefStatus.bind(null, id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.statusForm}>
      <label className={styles.field}>Статус заявки
        <select className={styles.input} name="status" defaultValue={currentStatus} disabled={pending}>
          {statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
        </select>
      </label>
      <button className={styles.button} type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить статус"}</button>
      {state.message ? <p className={state.ok ? styles.success : styles.error} role="status">{state.message}</p> : null}
    </form>
  );
}
