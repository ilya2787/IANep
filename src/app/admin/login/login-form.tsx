"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAdmin } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className={styles.button} type="submit" disabled={pending}>{pending ? "Входим…" : "Войти в рабочее пространство"}<span aria-hidden="true"> →</span></button>;
}

export function LoginForm({ error }: { error?: string }) {
  const [visible, setVisible] = useState(false);
  return <form action={loginAdmin} className={styles.form}>
    {error === "credentials" ? <p className={styles.error} role="alert">Неверный логин или пароль.</p> : null}
    {error === "rate-limit" ? <p className={styles.error} role="alert">Слишком много попыток. Попробуйте снова через 15 минут.</p> : null}
    <label className={styles.field}>Логин<input className={styles.input} name="username" autoComplete="username" placeholder="Ваш логин" maxLength={100} required /></label>
    <div className={styles.field}><label htmlFor="admin-password">Пароль</label><span className={styles.passwordWrap}><input className={styles.input} id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" maxLength={500} required /><button className={styles.passwordToggle} type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible}>{visible ? "Скрыть" : "Показать"}</button></span></div>
    <SubmitButton />
  </form>;
}
