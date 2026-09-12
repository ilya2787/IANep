import { LEGAL_DOCUMENTS, LEGAL_OPERATOR, LEGAL_ROUTES } from "@/config/legal";

export type LegalInline = { readonly type: "text" | "link"; readonly value: string; readonly href?: string };
export type LegalContentBlock = { readonly type: "paragraph"; readonly content: readonly LegalInline[] };
export type LegalContentSection = { readonly id: string; readonly title: string; readonly blocks: readonly LegalContentBlock[] };
export type BriefConsentRevision = { readonly version: string; readonly effectiveDate: string; readonly title: string; readonly lead: string; readonly sections: readonly LegalContentSection[] };
const text = (value: string): LegalInline => ({ type: "text", value });
const link = (value: string, href: string): LegalInline => ({ type: "link", value, href });

/* Архив только дополняется. Для новой редакции добавьте запись и затем измените
 * текущую версию в legal.ts. История Git сохраняет происхождение каждого текста. */
export const BRIEF_CONSENT_REVISIONS = {
  "1.0": {
    version: "1.0",
    effectiveDate: "11 сентября 2026 года",
    title: "Согласие на обработку персональных данных для заявки",
    lead: "Согласие на обработку данных, необходимых для получения заявки и обсуждения проекта.",
    sections: [
      { id: "consent", title: "На что даётся согласие", blocks: [{ type: "paragraph", content: [text("Отправляя анкету проекта и устанавливая отметку о согласии, я свободно, своей волей и в своём интересе даю "), text(LEGAL_OPERATOR.name), text(", физическому лицу, согласие на обработку указанных ниже персональных данных на условиях этого документа.")] }] },
      { id: "data", title: "Какие данные обрабатываются", blocks: [{ type: "paragraph", content: [text("Имя; выбранный способ связи и контакт — адрес электронной почты, номер телефона или имя пользователя в Telegram; ответы анкеты о проекте, сроках, бюджете, материалах и пожеланиях; необязательный комментарий; дата принятия и версия этого согласия.")] }] },
      { id: "purpose", title: "Цель обработки", blocks: [{ type: "paragraph", content: [text("Получение и рассмотрение заявки, связь со мной выбранным способом, уточнение задачи, обсуждение возможного проекта и подготовка предложения. Данные не используются на основании этого согласия для рекламной рассылки.")] }] },
      { id: "actions", title: "Действия с данными", blocks: [{ type: "paragraph", content: [text("Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, блокирование и уничтожение с использованием средств автоматизации или без них в объёме, необходимом для рассмотрения заявки и связи со мной.")] }] },
      { id: "term", title: "Срок действия и прекращение обработки", blocks: [
        { type: "paragraph", content: [text("Согласие действует до достижения цели обработки, его отзыва или прекращения обработки по другому основанию. После перевода невостребованной заявки в архив применяется назначенный оператором срок хранения и контролируемое уничтожение, если закон или защита прав не требуют сохранить отдельные сведения дольше.")] },
        { type: "paragraph", content: [text("Отозвать согласие или потребовать прекращения обработки можно по адресу "), link(LEGAL_OPERATOR.email, `mailto:${LEGAL_OPERATOR.email}`), text(". Отзыв не делает незаконной обработку, выполненную до его получения, и не исключает обработку на ином предусмотренном законом основании.")] },
      ] },
      { id: "policy", title: "Дополнительная информация", blocks: [{ type: "paragraph", content: [text("Подробности приведены в "), link("Политике обработки персональных данных", LEGAL_ROUTES.privacy), text(". Версия согласия и время его принятия фиксируются сервером вместе с заявкой.")] }] },
    ],
  },
} as const satisfies Record<string, BriefConsentRevision>;

export type BriefConsentVersion = keyof typeof BRIEF_CONSENT_REVISIONS;
if (!(LEGAL_DOCUMENTS.briefConsent.version in BRIEF_CONSENT_REVISIONS)) throw new Error("Текущая версия согласия отсутствует в архивном реестре");
export function findBriefConsentRevision(revisions: Readonly<Record<string, BriefConsentRevision>>, version: string): BriefConsentRevision | undefined { return revisions[version]; }
export function getBriefConsentRevision(version: string): BriefConsentRevision | undefined { return findBriefConsentRevision(BRIEF_CONSENT_REVISIONS, version); }
export function getCurrentBriefConsentRevision(): BriefConsentRevision { return BRIEF_CONSENT_REVISIONS[LEGAL_DOCUMENTS.briefConsent.version]; }
