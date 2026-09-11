"use client";

import { useActionState } from "react";
import { lookupCompletedRequests, type PrivacyLookupState } from "./actions";
import s from "@/components/workspace/workspace.module.css";

const scopeLabels: Record<string, string> = { BRIEF: "Заявка", PROJECT: "Проект", CLIENT: "Клиентский аккаунт" };
const resultLabels: Record<string, string> = { DESTROYED: "Данные уничтожены", PARTIALLY_PRESERVED: "Часть данных сохранена по основанию", NOT_DESTROYED: "Данные не уничтожены" };
const channelLabels: Record<string, string> = { EMAIL: "Email", PHONE: "Телефон", IN_PERSON: "Лично", OTHER: "Другой канал" };
const initialState: PrivacyLookupState = { ok: false, message: "" };

export function PrivacyLookupForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(lookupCompletedRequests, initialState);
  return <div className={s.lookupBlock}><form action={action} className={s.form} aria-busy={pending}><fieldset disabled={!ready || pending}><label>Email для проверки<input type="email" name="email" required maxLength={254} autoComplete="off" placeholder="client@example.ru" /></label><p className={s.muted}>Email отправляется только в теле POST-запроса, преобразуется на сервере в HMAC и не записывается в журнал событий.</p><button className={s.primary} disabled={!ready || pending}>{pending ? "Проверяем…" : "Проверить ранее исполненные запросы"}</button></fieldset></form>{!ready && <p className={s.readinessProblem} role="alert">Проверка и регистрация запросов недоступны: серверный секрет для защищённого сопоставления не настроен.</p>}{state.message && <p className={state.ok ? s.notice : s.error} role={state.ok ? "status" : "alert"}>{state.message}</p>}{state.matches?.length ? <div className={s.lookupResults}>{state.matches.map(item => <article key={`${item.number}-${item.completedAt}`}><strong>Запрос № {item.number}</strong><p>{scopeLabels[item.scope] ?? "Область запроса"} · канал: {channelLabels[item.channel] ?? "Не указан"}</p><p>Получен {new Date(item.receivedAt).toLocaleDateString("ru-RU")} · исполнен {new Date(item.completedAt).toLocaleDateString("ru-RU")}</p><p>{resultLabels[item.result] ?? "Результат зафиксирован"}</p><small>{item.categories.length ? item.categories.join("; ") : "Категории не указаны"}</small></article>)}</div> : null}</div>;
}
