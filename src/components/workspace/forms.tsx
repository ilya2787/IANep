"use client";

import { Select } from "@/components/ui/fields/Select";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

import { useActionState, useEffect, useRef, useState, useId, createContext, useContext } from "react";
import type { ActionState } from "@/app/client/actions";
import { kinds } from "@/server/client/model";
import s from "./workspace.module.css";

const UploadContext = createContext<(change: number) => void>(() => {});

export function WorkspaceForm({ action, children, submit = "Сохранить", tone = "default" }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; tone?: "default" | "danger" }) {
  const [uploads, setUploads] = useState(0);
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" });
  return <UploadContext.Provider value={change => setUploads(count => Math.max(0, count + change))}><form action={formAction} className={s.form} aria-busy={pending}><fieldset disabled={pending}>{children}</fieldset><div aria-live="polite">{state.message && <p className={state.ok ? s.notice : s.error} role={state.ok ? "status" : "alert"}>{state.message}</p>}</div><button className={tone === "danger" ? s.danger : s.primary} disabled={pending || uploads > 0}>{uploads > 0 ? "Загружаем файлы…" : pending ? "Сохраняем…" : submit}</button></form></UploadContext.Provider>;
}
function AttachmentRow({ multiple, projectId, side }: { multiple: boolean; projectId: string; side: "ADMIN" | "CLIENT" }) {
  const trackUpload = useContext(UploadContext);
  const [source, setSource] = useState("file");
  const [file, setFile] = useState<{ id: string; name: string; kind: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const statusId = useId();
  return <div className={s.stack}>
    <label>Название материала<input ref={title} name={multiple ? "materialTitle" : "title"} required maxLength={200} /></label>
    <label>Источник<Select label="Источник" value={source} onChange={event => { setSource(event.target.value); setError(""); }} disabled={busy}><option value="file">Загрузить файл</option><option value="link">Внешняя ссылка</option></Select></label>
    <input type="hidden" name="fileId" value={source === "file" ? file?.id ?? "" : ""} />
    {source === "link" ? <><label>Тип<Select name="kind">{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label>Ссылка<input name="url" type="url" placeholder="https://…" required maxLength={2000} /></label></> : <>
      <input type="hidden" name="kind" value={file?.kind ?? "FILE"} /><input type="hidden" name="url" value="" />
      <div className={s.filePicker}><span>Файл · до 20 МБ</span><button type="button" className={s.fileTrigger} disabled={busy} onClick={() => fileInput.current?.click()} aria-describedby={statusId}>{busy ? "Загрузка…" : file ? "Заменить файл" : "Выбрать файл"}<span aria-hidden="true">↑</span></button><input ref={fileInput} className={s.nativeFile} aria-label="Файл · до 20 МБ" tabIndex={-1} type="file" required={!file} disabled={busy} accept=".png,.jpg,.jpeg,.webp,.pdf,.zip,.docx,.xlsx,.pptx,.txt,.csv" aria-describedby={statusId} onChange={async event => {
        const input = event.target; const selected = input.files?.[0];
        if (!selected) return;
        setFile(null); setError("");
        if (selected.size > 20 * 1024 * 1024) { setError("Максимальный размер файла — 20 МБ."); event.target.value = ""; return; }
        setBusy(true); trackUpload(1); input.setCustomValidity("Дождитесь загрузки файла.");
        try {
          const response = await fetch(`/api/projects/${projectId}/files?side=${side}&name=${encodeURIComponent(selected.name)}`, { method: "POST", body: selected, headers: { "Content-Type": "application/octet-stream" } });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Загрузка не выполнена.");
          setFile(result); input.setCustomValidity(""); if (title.current && !title.current.value) title.current.value = selected.name;
        } catch (error) { input.setCustomValidity("Загрузите файл повторно."); setError(error instanceof Error ? error.message : "Не удалось загрузить файл."); }
        finally { setBusy(false); trackUpload(-1); }
      }} /></div>
      <p id={statusId} role="status" className={s.muted}>{busy ? "Загружаем файл… Дождитесь завершения перед сохранением." : file ? `Загружен: ${file.name}. Сохраните материал или опубликуйте результат.` : "PNG, JPEG, WebP, PDF, ZIP, Office, TXT или CSV. Файл доступен только участникам проекта."}</p>
      {error && <p className={s.error} role="alert">{error}</p>}
    </>}
  </div>;
}
export function MaterialFields({ multiple = false, projectId, side }: { multiple?: boolean; projectId: string; side: "ADMIN" | "CLIENT" }) {
  const [rows, setRows] = useState([0]); const next = useRef(1);
  return <div className={s.stack}>{rows.map((id, index) => <div key={id} className={s.materialFields}><AttachmentRow multiple={multiple} projectId={projectId} side={side} />{multiple && rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter(row => row !== id))}>Убрать материал {index + 1}</button>}</div>)}{multiple && rows.length < 20 && <button type="button" onClick={() => setRows([...rows, next.current++])}>Добавить ещё материал</button>}</div>;
}
export function ImagePreview({ url, title }: { url: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  return <div><button type="button" className={s.previewButton} onClick={() => setOpen(true)} aria-label={`Увеличить: ${title}`}>
    {/* Внешние материалы не проксируются через сервер. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {!failed ? <img src={url} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span>Превью недоступно. Открыть просмотр</span>}
  </button><dialog ref={dialog} className={s.lightbox} aria-label={title} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><button type="button" onClick={() => setOpen(false)} autoFocus>Закрыть просмотр</button><p>{title}</p>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={title} referrerPolicy="no-referrer" /><a href={url} target="_blank" rel="noopener noreferrer">Открыть оригинал ↗</a></dialog></div>;
}
