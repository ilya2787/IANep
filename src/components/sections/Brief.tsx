"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Container } from "@/components/layout";
import { Button } from "@/components/ui";
import {
  briefProjectTypes, briefSteps, briefSubmissionWarning, briefDeadlineWarning,
  getGoalOptions, getGoalQuestion, getFeatureOptions, designStyles, materialOptions,
  readinessOptions, timeframeOptions, budgetOptions, contactMethods,
} from "./brief.data";
import { briefStepFields, createBriefDraft, submitBriefSchema, type BriefAnswers } from "@/server/brief/brief.schema";
import { BriefDatePicker } from "./BriefDatePicker";
import { BriefIcon } from "./BriefIcon";
import styles from "./Brief.module.css";

type Errors = Record<string, string>;

export function Brief() {
  const [draft, setDraft] = useState(createBriefDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'pending' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [requestNumber, setRequestNumber] = useState('');
  const [replaced, setReplaced] = useState(false);
  const [duplicate, setDuplicate] = useState<{ number?: string; canReplace: boolean } | null>(null);
  const duplicateDialog = useRef<HTMLDialogElement>(null);
  const receipt = useRef('');
  const pending = useRef(false);
  const heading = useRef<HTMLLegendElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const previousStep = useRef(step);
  const a = draft.answers;

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [step]);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      feedback.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [status]);

  useEffect(() => {
    if (Object.keys(errors).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  useEffect(() => {
    if (duplicate) duplicateDialog.current?.showModal();
    else if (duplicateDialog.current?.open) duplicateDialog.current.close();
  }, [duplicate]);

  useEffect(() => {
    const handleSectionNavigation = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail?.id !== 'brief' || status !== 'success') return;
      restart();
    };
    window.addEventListener('ianep:section-navigation', handleSectionNavigation);
    return () => window.removeEventListener('ianep:section-navigation', handleSectionNavigation);
  }, [status]);

  function restart() {
    setDraft(createBriefDraft());
    setErrors({});
    setErrorMessage('');
    setStep(0);
    setStatus('idle');
    setDuplicate(null);
  }

  function answer<K extends keyof BriefAnswers>(key: K, value: BriefAnswers[K]) {
    setDraft((current) => ({ ...current, answers: { ...current.answers, [key]: value } }));
  }

  function selectProject(projectType: string) {
    setDraft((current) => ({ ...current, projectType, answers: { ...current.answers, goals: [], description: '', productCount: '', website: '', features: [], featureNotes: '' } }));
    setErrors({});
  }

  function toggle(key: 'goals' | 'features' | 'designStyles' | 'materials', value: string) {
    let next = a[key].includes(value) ? a[key].filter((item) => item !== value) : [...a[key], value];
    const exclusive = key === 'materials' ? 'Ничего пока нет' : key === 'designStyles' ? designStyles[2] : '';
    if (exclusive) next = value === exclusive ? (a[key].includes(value) ? [] : [value]) : next.filter((item) => item !== exclusive);
    setDraft((current) => ({ ...current, answers: {
      ...current.answers, [key]: next,
      ...(key === 'materials' ? { readiness: next.includes('Ничего пока нет') ? 'Пока ничего нет' : current.answers.readiness === 'Пока ничего нет' ? '' : current.answers.readiness } : {}),
    } }));
  }

  function errorFor(key: string) {
    return errors[key] ? <span id={`brief-error-${key}`} className={styles.fieldError}>{errors[key]}</span> : null;
  }

  function accessibility(key: string) {
    return { 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `brief-error-${key}` : undefined };
  }

  function options(key: keyof BriefAnswers, values: readonly string[], multiple = false) {
    return <><div className={styles.answerOptions}>
      {values.map((value) => <label className={styles.answerOption} key={value}>
        <input type={multiple ? 'checkbox' : 'radio'} name={key} value={value}
          checked={multiple ? (a[key] as string[]).includes(value) : a[key] === value}
          {...accessibility(key)}
          onChange={() => {
            if (multiple) toggle(key as 'goals' | 'features' | 'designStyles' | 'materials', value);
            else if (key === 'timeframe') setDraft((current) => ({ ...current, answers: { ...current.answers, timeframe: value, launchDate: '' } }));
            else if (key === 'contactMethod') setDraft((current) => ({ ...current, contact: '', answers: { ...current.answers, contactMethod: value } }));
            else if (key === 'readiness' && value === 'Пока ничего нет') setDraft((current) => ({ ...current, answers: { ...current.answers, readiness: value, materials: ['Ничего пока нет'] } }));
            else answer(key, value);
          }} />
        <span>{value}</span><span className={styles.choiceMark} aria-hidden="true" />
      </label>)}
    </div>{errorFor(key)}</>;
  }

  function field(key: keyof BriefAnswers, label: string, maxLength: number, type = 'textarea') {
    return <label className={styles.field}>
      <span>{label}</span>
      {type === 'textarea' ? <textarea name={key} value={String(a[key])} maxLength={maxLength} rows={4} {...accessibility(key)} onChange={(event) => answer(key, event.target.value)} />
        : <input name={key} type={type} value={String(a[key])} maxLength={maxLength} {...accessibility(key)} onChange={(event) => answer(key, event.target.value)} />}
      {errorFor(key)}
    </label>;
  }

  async function submit(event?: FormEvent, action?: 'new' | 'replace') {
    event?.preventDefault();
    if (pending.current || status === 'success') return;
    const result = submitBriefSchema.safeParse(draft);
    const issues = result.success ? [] : result.error.issues;
    const relevant = step === briefSteps.length - 1 ? issues : issues.filter((issue) => briefStepFields[step].includes(String(issue.path.at(-1))));
    if (relevant.length) {
      const nextErrors: Errors = {};
      for (const issue of relevant) nextErrors[String(issue.path.at(-1))] ??= issue.message;
      if (step === briefSteps.length - 1) {
        const invalidStep = briefStepFields.findIndex((keys) => relevant.some((issue) => keys.includes(String(issue.path.at(-1)))));
        if (invalidStep >= 0) setStep(invalidStep);
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    if (step < briefSteps.length - 1) { setStep(step + 1); return; }
    if (!result.success) return;
    if (!receipt.current) {
      try { receipt.current = sessionStorage.getItem('ianep-brief-receipt') ?? ''; } catch {}
    }
    setDuplicate(null);
    pending.current = true;
    setStatus('pending');
    setErrorMessage('');
    try {
      const response = await fetch('/api/brief', {
        method: 'POST', headers: {
          'Content-Type': 'application/json',
          ...(receipt.current ? { 'X-Brief-Receipt': receipt.current } : {}),
          ...(action ? { 'X-Brief-Action': action } : {}),
        }, body: JSON.stringify(result.data),
      });
      const body = await response.json();
      if (response.status === 409 && ['DUPLICATE_BRIEF', 'REPLACEMENT_UNAVAILABLE'].includes(body?.error?.code)) {
        setDuplicate({ number: body.error.number, canReplace: Boolean(body.error.canReplace) });
        setStatus('idle');
        return;
      }
      if (![200, 201].includes(response.status) || typeof body?.data?.id !== 'string') {
        if (response.status === 422 && Array.isArray(body?.error?.issues)) {
          const nextErrors: Errors = {};
          for (const issue of body.error.issues) {
            if (Array.isArray(issue.path) && typeof issue.message === 'string') nextErrors[String(issue.path.at(-1))] = issue.message;
          }
          setErrors(nextErrors);
          const invalidStep = briefStepFields.findIndex((keys) => keys.some((key) => nextErrors[key]));
          if (invalidStep >= 0) setStep(invalidStep);
        }
        setErrorMessage(response.status === 422 ? 'Проверьте данные заявки. Ответы сохранены.' : 'Не удалось отправить заявку. Ответы сохранены, попробуйте ещё раз.');
        setStatus('error');
        return;
      }
      setRequestNumber(body.data.number ?? '');
      setReplaced(Boolean(body.data.replaced));
      if (typeof body.data.receipt === 'string') {
        receipt.current = body.data.receipt;
        try { sessionStorage.setItem('ianep-brief-receipt', body.data.receipt); } catch {}
      }
      setStatus('success');
    } catch {
      setErrorMessage('Не удалось получить подтверждение отправки. Проверьте соединение. Ответы сохранены; при повторной отправке возможна повторная заявка.');
      setStatus('error');
    } finally {
      pending.current = false;
    }
  }

  let content: ReactNode;
  switch (step) {
    case 0:
      content = <><div className={styles.options}>{briefProjectTypes.map((option) => (
        <label className={styles.option} key={option.id}>
          <input className={styles.radio} type="radio" name="projectType" value={option.id} checked={draft.projectType === option.id} {...accessibility('projectType')} onChange={() => selectProject(option.id)} />
          <span className={styles.optionIcon}><BriefIcon name={option.icon} /></span>
          <span className={styles.optionText}>{option.label}</span>
          <span className={styles.optionMark} aria-hidden="true">✓</span>
        </label>
      ))}</div>{errorFor('projectType')}</>;
      break;
    case 1:
      content = <>
        {getGoalOptions(draft.projectType).length > 0 && options('goals', getGoalOptions(draft.projectType), true)}
        {field('description', getGoalOptions(draft.projectType).length ? 'Расскажите немного о проекте (необязательно)' : getGoalQuestion(draft.projectType), 3000)}
        {draft.projectType === 'online-store' && field('productCount', 'Примерное количество товаров (необязательно)', 100, 'text')}
        {['site-improvements', 'support'].includes(draft.projectType) && field('website', 'Адрес существующего сайта (необязательно)', 1000, 'url')}
      </>;
      break;
    case 2:
      content = <>{options('features', getFeatureOptions(draft.projectType), true)}
        <p className={styles.hint}>Не уверены, что выбрать? Отметьте или опишите необходимое. Остальное обсудим вместе.</p>
        {field('featureNotes', 'Какие функции вам нужны? (необязательно)', 3000)}
      </>;
      break;
    case 3:
      content = <>{options('designStyles', designStyles, true)}
        {field('designReference', 'Ссылка на понравившийся сайт (необязательно)', 1000, 'url')}
        {field('designNotes', 'Пожелания по дизайну (необязательно)', 2000)}
      </>;
      break;
    case 4:
      content = <>{options('materials', materialOptions, true)}
        <fieldset className={styles.subFieldset}><legend>Насколько материалы готовы?</legend>{options('readiness', readinessOptions)}</fieldset>
        <p className={styles.hint}>Материалы не нужно отправлять сейчас. Мы запросим всё необходимое после обсуждения проекта.</p>
        <p className={styles.hint}>Срок разработки рассчитывается после согласования проекта и получения материалов, необходимых для начала работ.</p>
      </>;
      break;
    case 5:
      content = <>{options('timeframe', timeframeOptions)}
        {a.timeframe === 'Есть конкретная дата' && <BriefDatePicker value={a.launchDate} onChange={(value) => answer('launchDate', value)} error={errors.launchDate} />}
        <p className={styles.hint}>{briefDeadlineWarning}</p>
      </>;
      break;
    case 6:
      content = <>{options('budget', budgetOptions)}<p className={styles.hint}>Бюджет помогает подобрать подходящий объём решения и не является окончательной стоимостью.</p></>;
      break;
    default:
      content = <>
        <p className={styles.hint}>Оставьте контакты, чтобы мы могли обсудить проект.</p>
        <label className={styles.field}><span>Имя</span><input name="name" autoComplete="name" value={draft.name} maxLength={100} {...accessibility('name')} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />{errorFor('name')}</label>
        <fieldset className={styles.subFieldset}><legend>Как удобнее связаться?</legend>{options('contactMethod', contactMethods)}</fieldset>
        {a.contactMethod && <label className={styles.field}><span>{a.contactMethod}</span>
          <input name="contact" type={a.contactMethod === 'Email' ? 'email' : a.contactMethod === 'Телефон' ? 'tel' : 'text'} autoComplete={a.contactMethod === 'Email' ? 'email' : a.contactMethod === 'Телефон' ? 'tel' : 'off'} autoCapitalize="none" spellCheck={false} placeholder={a.contactMethod === 'Telegram' ? '@username' : undefined} value={draft.contact} maxLength={200} {...accessibility('contact')} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} />{errorFor('contact')}
        </label>}
        {field('comment', 'Комментарий (необязательно)', 2000)}
        <label className={styles.consent}><input name="consent" type="checkbox" checked={a.consent} {...accessibility('consent')} onChange={(event) => answer('consent', event.target.checked)} /><span>Согласен на обработку персональных данных для обсуждения проекта</span></label>
        {errorFor('consent')}
      </>;
  }

  return (
    <section className={styles.brief} id="brief" aria-labelledby="brief-title" data-motion-section="brief" data-motion-from="approach" data-motion-to="faq">
      <Container>
        <div className={styles.layout}>
          <div data-reveal className={styles.leftColumn}>
            <header className={styles.intro}>
              <h2 className={styles.title} id="brief-title" tabIndex={-1} data-section-focus>Рассчитаем проект<br />под <span>ваши задачи</span></h2>
              <p className={styles.subtitle}>Ответьте на несколько вопросов. Мы подготовим оценку, подход и сроки реализации.</p>
            </header>
            {status === 'success' ? <div className={`${styles.form} ${styles.success}`} ref={feedback} tabIndex={-1} role="status">
              <div className={styles.successStatus}><span className={styles.successCheck} aria-hidden="true" />{replaced ? 'Изменения сохранены' : 'Отправлено успешно'}</div>
              <h3>{replaced ? 'Заявка обновлена' : 'Заявка отправлена'}</h3>
              <p className={styles.successLead}>Спасибо! {replaced ? 'Новые ответы заменили предыдущую версию заявки.' : 'Информация о вашем проекте уже у нас.'} Изучим её и свяжемся для уточнения деталей.</p>
              <Image className={styles.successMobileMascot} src="/images/brief/mascot-success-v2.png" alt="Персонаж IANep показывает большой палец вверх и анкету с галочкой" width={520} height={1100} sizes="180px" />
              <div className={styles.successReceipt}>
                <div><span>Номер заявки</span><strong>{requestNumber}</strong></div>
                <div><span>Ваш проект</span><strong>{briefProjectTypes.find((item) => item.id === draft.projectType)?.label}</strong></div>
              </div>
              <p className={styles.submissionWarning}>{briefSubmissionWarning}</p>
              <div className={styles.successActions}><Button type="button" onClick={restart}>Заполнить ещё один бриф <span aria-hidden="true">↗</span></Button></div>
            </div> : <form ref={form} className={styles.form} onSubmit={submit} noValidate aria-busy={status === 'pending'}>
              <div className={styles.progressHeading}><span>{briefSteps[step].group}</span><span>Шаг {step + 1} из {briefSteps.length}</span></div>
              <ol className={styles.progress} aria-label="Шаги брифа" style={{ gridTemplateColumns: `repeat(${briefSteps.length}, minmax(0, 1fr))` }}>
                {briefSteps.map((item, index) => <li className={styles.progressItem} data-active={index <= step} aria-current={index === step ? 'step' : undefined} key={item.id}><span>{index + 1}. {item.group}</span></li>)}
              </ol>
              <fieldset className={styles.fieldset} disabled={status === 'pending'} key={step}>
                <legend className={styles.question} ref={heading} tabIndex={-1}>{step === 1 ? getGoalQuestion(draft.projectType) : briefSteps[step].question}</legend>
                {content}
              </fieldset>
              {status === 'error' && <div className={styles.formError} role="alert" tabIndex={-1} ref={feedback}>{errorMessage}</div>}
              <p className={styles.submissionWarning}>{briefSubmissionWarning}</p>
              <div className={styles.formFooter}>
                {step > 0 && <Button type="button" variant="secondary" disabled={status === 'pending'} onClick={() => { setErrors({}); setStatus('idle'); setStep(step - 1); }}>← Назад</Button>}
                <Button type="submit" disabled={status === 'pending'}>{status === 'pending' ? 'Отправляем…' : step === briefSteps.length - 1 ? 'Отправить проект →' : 'Далее →'}</Button>
              </div>
              <span role="status" className={styles.srOnly}>{status === 'pending' ? 'Отправляем заявку' : ''}</span>
            </form>}
          </div>

          <div data-reveal className={styles.mascotScene} data-success={status === 'success'}>
            <Image
              className={styles.mascot}
              src={status === 'success' ? "/images/brief/mascot-success-v2.png" : "/images/brief/mascot-questionnaire-v2.png"}
              alt={status === 'success' ? "Персонаж IANep показывает класс: заявка отправлена" : "Персонаж IANep в полный рост держит большую анкету проекта"}
              width={1024}
              height={1536}
              sizes="(max-width: 48rem) 90vw, (max-width: 72rem) 32rem, 38vw"
            />
          </div>
        </div>
      </Container>
      <dialog className={styles.dialog} ref={duplicateDialog} aria-labelledby="brief-duplicate-title" aria-describedby="brief-duplicate-description" onCancel={() => setDuplicate(null)} onClose={() => setDuplicate(null)}>
        <div className={styles.dialogHeading}><span className={styles.dialogLabel}>Повторная заявка</span><button type="button" className={styles.iconButton} aria-label="Закрыть окно" onClick={() => setDuplicate(null)}>×</button></div>
        <h3 id="brief-duplicate-title">{duplicate?.canReplace ? 'Как сохранить новый бриф?' : 'Создать ещё одну заявку?'}</h3>
        <p id="brief-duplicate-description" className={styles.hint}>{duplicate?.canReplace ? `С этим контактом вы уже отправили заявку ${duplicate.number ?? ''}. Можно заменить её ответы или сохранить ещё одну заявку.` : 'Предыдущая заявка уже рассматривается или недоступна для изменения. Новую можно отправить отдельно.'}</p>
        <div className={styles.duplicateActions}>
          {duplicate?.canReplace && <Button type="button" onClick={() => void submit(undefined, 'replace')}>Заменить предыдущую</Button>}
          <Button type="button" variant={duplicate?.canReplace ? 'secondary' : 'primary'} onClick={() => void submit(undefined, 'new')}>Создать новую</Button>
          <Button type="button" variant="ghost" onClick={() => setDuplicate(null)}>Вернуться к брифу</Button>
        </div>
      </dialog>
    </section>
  );
}
