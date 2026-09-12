import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAdminDate } from "@/app/admin/brief-presenter";
import styles from "@/app/admin/admin.module.css";
import { getBriefConsentRevision, type LegalInline } from "@/config/brief-consent";
import { LEGAL_DOCUMENTS } from "@/config/legal";
import { briefService } from "@/server/brief/brief.service";

type ConsentPageProps = { params: Promise<{ id: string }> };

function renderInline(item: LegalInline, index: number) {
  return item.type === "link" && item.href ? <Link href={item.href} key={index}>{item.value}</Link> : item.value;
}

export default async function BriefConsentEvidencePage({ params }: ConsentPageProps) {
  const { id } = await params;
  const brief = await briefService.getForAdmin(id);
  if (!brief) notFound();

  const revision = brief.consentVersion ? getBriefConsentRevision(brief.consentVersion) : undefined;
  const backHref = `/admin/briefs/${brief.id}`;

  return <article className={styles.consentEvidence}>
    <Link className={styles.backLink} href={backHref}>← Вернуться к заявке № {brief.number}</Link>
    <header className={styles.consentEvidenceHeader}>
      <div>
        <p className={styles.eyebrow}>Подтверждение согласия</p>
        <h1 className={styles.pageTitle}>{revision?.title ?? "Редакция согласия недоступна"}</h1>
      </div>
      {revision && <span className={styles.revisionStatus}>{revision.version === LEGAL_DOCUMENTS.briefConsent.version ? "Действующая" : "Архивная"}</span>}
    </header>

    <dl className={styles.consentEvidenceMeta}>
      <div><dt>Заявка</dt><dd>№ {brief.number}</dd></div>
      <div><dt>Принято</dt><dd>{brief.consentAcceptedAt ? <time dateTime={brief.consentAcceptedAt.toISOString()}>{formatAdminDate(brief.consentAcceptedAt)}</time> : "Нет подтверждающих сведений"}</dd></div>
      <div><dt>Версия</dt><dd>{brief.consentVersion ?? "Не зафиксирована"}</dd></div>
      <div><dt>Действует с</dt><dd>{revision?.effectiveDate ?? "Неизвестно"}</dd></div>
    </dl>

    {!brief.consentAcceptedAt || !brief.consentVersion ? <section className={styles.consentUnavailable} aria-labelledby="consent-unavailable-title"><h2 id="consent-unavailable-title">Нет подтверждающих сведений</h2><p>Эта заявка была создана до начала фиксации версии и времени принятия согласия. Эти сведения не присваиваются задним числом.</p></section>
      : !revision ? <section className={styles.consentUnavailable} aria-labelledby="consent-unavailable-title"><h2 id="consent-unavailable-title">Текст версии {brief.consentVersion} не найден</h2><p>Текущая редакция не подставлена вместо отсутствующей. Проверьте архивный реестр и историю выпуска.</p></section>
      : <section className={styles.consentDocument} aria-label={`Текст согласия версии ${revision.version}`}>
        <p className={styles.consentLead}>{revision.lead}</p>
        {revision.sections.map((section) => <section key={section.id}><h2>{section.title}</h2>{section.blocks.map((block, blockIndex) => <p key={blockIndex}>{block.content.map(renderInline)}</p>)}</section>)}
      </section>}
  </article>;
}
