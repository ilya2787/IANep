"use client";

import { useState } from "react";
import { registerRequest } from "./actions";
import { WorkspaceForm } from "@/components/workspace/forms";
import { Select } from "@/components/ui/fields/Select";
import { maskRussianPhone } from "@/server/contact/normalization";
import s from "@/components/workspace/workspace.module.css";

const kindLabels = { CONSENT_WITHDRAWAL: "Отзыв согласия", ERASURE: "Требование об уничтожении", PROCESSING_TERMINATION: "Требование прекратить обработку", OTHER: "Иное требование" } as const;
const channelLabels = { EMAIL: "Email", PHONE: "Телефон", FORM: "Форма сайта", WRITTEN: "Письменное обращение", IN_PERSON: "Лично", OTHER: "Другой канал" } as const;

export function PrivacyRegisterForm({ scope, targets, lookupReady }: { scope: "BRIEF" | "PROJECT" | "CLIENT"; targets: Array<{ id: string; label: string }>; lookupReady: boolean }) {
  const [channel, setChannel] = useState<keyof typeof channelLabels>(lookupReady ? "EMAIL" : "FORM");
  const identified = channel === "EMAIL" || channel === "PHONE";
  return <WorkspaceForm action={registerRequest} submit="Зарегистрировать без удаления">
    <input type="hidden" name="scope" value={scope} />
    <div className={s.grid}>
      <label>Тип требования<Select name="kind" defaultValue="CONSENT_WITHDRAWAL" label="Тип требования">{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></label>
      <label>Канал обращения<Select name="channel" value={channel} onChange={(event) => setChannel(event.target.value as keyof typeof channelLabels)} label="Канал обращения">{Object.entries(channelLabels).map(([value, label]) => <option value={value} key={value} disabled={!lookupReady && (value === "EMAIL" || value === "PHONE")}>{label}</option>)}</Select></label>
    </div>
    {identified && <label>{channel === "EMAIL" ? "Email обращения" : "Телефон обращения"}<input name="lookupValue" type={channel === "EMAIL" ? "email" : "tel"} inputMode={channel === "PHONE" ? "tel" : "email"} autoComplete="off" required maxLength={254} placeholder={channel === "EMAIL" ? "client@example.ru" : "+7 (___) ___-__-__"} onChange={channel === "PHONE" ? (event) => { event.currentTarget.value = maskRussianPhone(event.currentTarget.value); } : undefined} /><small className={s.muted}>Значение преобразуется в HMAC на сервере и не сохраняется в открытом виде.</small></label>}
    {!identified && <p className={s.muted}>Контакт не требуется. Идентификация фиксируется выбранным объектом и последующим подтверждением состава данных.</p>}
    {!lookupReady && <p className={s.readinessProblem} role="status">Email/телефон временно недоступны: серверный секрет не настроен. Остальные каналы можно зарегистрировать без HMAC.</p>}
    <label>Субъект и область<Select name="targetId" required label="Субъект и область">{targets.map(target => <option value={target.id} key={target.id}>{target.label}</option>)}</Select></label>
    <div className={s.grid}><label>Дата получения<input name="receivedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Контрольный срок · необязательно<input name="dueAt" type="date" /></label></div>
  </WorkspaceForm>;
}
