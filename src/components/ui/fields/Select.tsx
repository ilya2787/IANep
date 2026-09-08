"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./fields.module.css";

type Option = { value: string; label: string; disabled?: boolean };
export function Select({ name, defaultValue, value: controlled, onChange, disabled, required, children, label, className }: { name?: string; defaultValue?: string; value?: string; onChange?: (event: { target: { value: string } }) => void; disabled?: boolean; required?: boolean; children: ReactNode; label?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const id = useId();
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child)) return [];
    return [{ value: String(child.props.value ?? ""), label: Children.toArray(child.props.children).join(""), disabled: child.props.disabled }];
  });
  const selected = controlled ?? value ?? options[0]?.value ?? "";
  const names: Record<string, string> = { status: "Статус", kind: "Тип материала", clientId: "Клиент", stageId: "Относится к", counts: "Учёт в лимите", operation: "Действие" };
  const title = label || names[name || ""] || "Выберите значение";
  useEffect(() => {
    if (open) { dialog.current?.showModal(); const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'); const selectedButton = dialog.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)'); (selectedButton || buttons?.[0])?.focus(); }
  }, [open]);
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  function choose(option: Option) { if (option.disabled) return; setInvalid(false); setValue(option.value); onChange?.({ target: { value: option.value } }); close(); }
  return <span className={s.select}>
    <select ref={native} name={name} value={selected} onChange={event => { setValue(event.target.value); onChange?.(event); }} disabled={disabled} required={required} className={s.native} tabIndex={-1} aria-hidden="true" onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); }}>
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    <button ref={trigger} type="button" role="combobox" aria-label={title} aria-invalid={invalid || undefined} aria-haspopup="listbox" aria-controls={id} aria-expanded={open} className={`${s.trigger} ${className || ""}`} disabled={disabled} onClick={() => setOpen(true)}><span>{options.find(option => option.value === selected)?.label || options[0]?.label || "Выберите значение"}</span><span aria-hidden="true">⌄</span></button>
    {invalid && <span role="alert">Выберите значение: {title.toLocaleLowerCase("ru")}.</span>}
    {createPortalIfOpen()}
  </span>;

  function createPortalIfOpen() { return open ? createPortal(<dialog ref={dialog} className={s.dialog} aria-label={title} onCancel={() => { setOpen(false); trigger.current?.focus(); }} onClose={() => setOpen(false)}>
      <div className={s.heading}><strong>{title}</strong><button type="button" aria-label="Закрыть список" onClick={close}>×</button></div>
      <div id={id} role="listbox" aria-label={title} className={s.options} onKeyDown={event => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        let next = index;
        if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else if (event.key.length === 1 && event.key !== " ") { const found = buttons.findIndex((button, position) => position > index && button.textContent?.toLocaleLowerCase("ru").startsWith(event.key.toLocaleLowerCase("ru"))); next = found >= 0 ? found : buttons.findIndex(button => button.textContent?.toLocaleLowerCase("ru").startsWith(event.key.toLocaleLowerCase("ru"))); }
        else return;
        event.preventDefault(); buttons[next]?.focus();
      }}>{options.map(option => <button type="button" role="option" aria-selected={option.value === selected} disabled={option.disabled} key={option.value} onClick={() => choose(option)}>{option.label}<span aria-hidden="true">{option.value === selected ? "✓" : ""}</span></button>)}</div>
    </dialog>, document.body) : null; }
}
