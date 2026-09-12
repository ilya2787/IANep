import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LEGAL_OPERATOR } from "@/config/legal";
import styles from "./LegalDocument.module.css";
export type LegalSection = { id: string; title: string; content: ReactNode };
export function LegalDocument({ title, lead, version, effectiveDate, sections }: { title: string; lead: string; version: string; effectiveDate: string; sections: readonly LegalSection[] }) {
  return <div className={styles.page}><header className={styles.header}><Container className={styles.headerInner}><Link className={styles.brand} href="/"><span>IA</span>Nep</Link><div className={styles.headerActions}><Link className={styles.back} href="/">На главную</Link><ThemeToggle /></div></Container></header><main id="main-content" className={styles.main}><Container><header className={styles.hero}><div><h1 className={styles.title}>{title}</h1><p className={styles.lead}>{lead}</p></div><dl className={styles.meta}><dt>Версия</dt><dd>{version}</dd><dt>Действует с</dt><dd>{effectiveDate}</dd></dl></header><div className={styles.layout}><nav className={styles.toc} aria-label="Содержание документа"><h2>Содержание</h2><ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav><article className={styles.content}>{sections.map((section) => <section className={styles.section} id={section.id} key={section.id}><h2>{section.title}</h2>{section.content}</section>)}</article></div></Container></main><footer className={styles.footer}><Container className={styles.footerInner}><span>© 2026 IANep</span><span>По юридическим вопросам: <a href={`mailto:${LEGAL_OPERATOR.email}`}>{LEGAL_OPERATOR.email}</a></span></Container></footer></div>;
}
