export const LEGAL_DOCUMENTS = {
  privacy: { version: "2026-09-11", effectiveDate: "11 сентября 2026 года" },
  briefConsent: { version: "1.0", effectiveDate: "11 сентября 2026 года" },
  cookies: { version: "2026-09-11", effectiveDate: "11 сентября 2026 года" },
  clientTerms: { version: "2026-09-11", effectiveDate: "11 сентября 2026 года" },
} as const;
export const LEGAL_VERSIONS = {
  privacy: LEGAL_DOCUMENTS.privacy.version,
  briefConsent: LEGAL_DOCUMENTS.briefConsent.version,
  cookies: LEGAL_DOCUMENTS.cookies.version,
  clientTerms: LEGAL_DOCUMENTS.clientTerms.version,
} as const;
export const LEGAL_ROUTES = { privacy: "/legal/privacy", briefConsent: "/legal/brief-consent", cookies: "/legal/cookies", clientTerms: "/legal/client-terms" } as const;
export const LEGAL_OPERATOR = { name: "Непряхин Илья Сергеевич", status: "физическое лицо", email: "info@ianep.ru", site: "https://ianep.ru" } as const;
