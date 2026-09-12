"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import styles from './Brief.module.css';

const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parse = (value: string) => value ? new Date(`${value}T12:00:00`) : new Date();

export function BriefDatePicker({ value, onChange, error, name = "launchDate", label = "Желаемая дата запуска", title = "Дата запуска", hint = "Окончательный срок определим после обсуждения проекта." }: { value: string; onChange: (value: string) => void; error?: string; name?: string; label?: string; title?: string; hint?: string }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => iso(parse(value)));
  const [monthView, setMonthView] = useState(false);
  useBodyScrollLock(open);
  const current = parse(cursor);
  const year = current.getFullYear();
  const month = current.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(year, month, index - offset + 1, 12));

  useEffect(() => {
    if (open) { const button = trigger.current; if (!dialog.current?.open) dialog.current?.showModal(); return () => { button?.focus({ preventScroll: true }); }; }
    else if (dialog.current?.open) { dialog.current.close(); trigger.current?.focus({ preventScroll: true }); }
  }, [open]);

  useEffect(() => {
    if (open && !monthView) dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)?.focus();
  }, [cursor, open, monthView]);

  function move(amount: number, years = false) {
    setCursor(iso(new Date(year + (years ? amount : 0), month + (years ? 0 : amount), 1, 12)));
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const increments: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -((current.getDay() + 6) % 7), End: 6 - ((current.getDay() + 6) % 7) };
    if (event.key in increments) {
      event.preventDefault();
      const next = new Date(current);
      next.setDate(next.getDate() + increments[event.key]);
      setCursor(iso(next));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault(); move(event.key === 'PageUp' ? -1 : 1, event.shiftKey);
    }
  }

  function select(date: Date) { onChange(iso(date)); setOpen(false); }

  return <div className={styles.field}>
    <span id={`${id}-brief-date-label`}>{label}</span>
    <button ref={trigger} type="button" role="combobox" aria-controls={`${id}-brief-date-dialog`} className={styles.dateTrigger} aria-labelledby={`${id}-brief-date-label ${id}-brief-date-value`} aria-haspopup="dialog" aria-expanded={open} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
      onClick={() => { setCursor(iso(parse(value))); setMonthView(false); setOpen(true); }}>
      <span id={`${id}-brief-date-value`}>{value ? parse(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Выберите дату'}</span>
      <span className={styles.calendarGlyph} aria-hidden="true"><span /></span>
    </button>
    <input type="hidden" name={name} value={value} />
    {error && <span id={`${id}-error`} className={styles.fieldError}>{error}</span>}
    {open && createPortal(<dialog id={`${id}-brief-date-dialog`} ref={dialog} className={`${styles.dialog} ${styles.calendar}`} aria-labelledby={`${id}-brief-calendar-title`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false); } }}>
      <div className={styles.dialogHeading}><h3 id={`${id}-brief-calendar-title`}>{title}</h3><button type="button" className={styles.iconButton} aria-label="Закрыть календарь" onClick={() => setOpen(false)}>×</button></div>
      <div className={styles.calendarNav}>
        <button type="button" className={styles.iconButton} aria-label={monthView ? 'Предыдущий год' : 'Предыдущий месяц'} onClick={() => move(-1, monthView)}>‹</button>
        <button type="button" className={styles.monthToggle} aria-expanded={monthView} onClick={() => setMonthView(!monthView)}>{monthView ? year : `${months[month]} ${year}`} <span aria-hidden="true">⌄</span></button>
        <button type="button" className={styles.iconButton} aria-label={monthView ? 'Следующий год' : 'Следующий месяц'} onClick={() => move(1, monthView)}>›</button>
      </div>
      <p className={styles.srOnly} aria-live="polite">{months[month]} {year}</p>
      {monthView ? <div className={styles.monthGrid}>{months.map((label, index) => <button type="button" key={label} aria-pressed={month === index} onClick={() => { setCursor(iso(new Date(year, index, 1, 12))); setMonthView(false); }}>{label}</button>)}</div>
        : <><div className={styles.weekdays} aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className={styles.dateGrid} role="group" aria-label="Дни месяца">{days.map((date) => {
            const key = iso(date);
            return <button type="button" key={key} data-date={key} data-outside={date.getMonth() !== month} data-today={key === iso(new Date())} aria-pressed={key === value} tabIndex={key === cursor ? 0 : -1} aria-label={date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} onKeyDown={keyboard} onClick={() => select(date)}>{date.getDate()}</button>;
          })}</div></>}
      <div className={styles.calendarFooter}><button type="button" onClick={() => select(new Date())}>Сегодня</button><button type="button" onClick={() => { onChange(''); setOpen(false); }}>Очистить</button></div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </dialog>, document.body)}
  </div>;
}
