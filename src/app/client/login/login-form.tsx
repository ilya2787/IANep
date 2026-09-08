"use client";

import { useActionState, useState } from "react";
import { loginClient } from "@/app/client/actions";
import styles from "@/app/admin/admin.module.css";

export function ClientLoginForm() {
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(loginClient, { ok: false, message: "" });
  return <form action={action} className={styles.form} aria-busy={pending}>
    {state.message && <p className={styles.error} role="alert">{state.message}</p>}
    <label className={styles.field}>Логин<input className={styles.input} name="username" autoComplete="username" placeholder="Ваш логин" maxLength={100} required /></label>
    <div className={styles.field}><label htmlFor="client-password">Пароль</label><span className={styles.passwordWrap}><input className={styles.input} id="client-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" maxLength={500} required /><button className={styles.passwordToggle} type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible}>{visible ? "Скрыть" : "Показать"}</button></span></div>
    <button className={styles.button} type="submit" disabled={pending}>{pending ? "Входим…" : "Войти в кабинет"}<span aria-hidden="true"> →</span></button>
  </form>;
}
