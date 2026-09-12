import { LegalDocument, structuredLegalSections } from "@/components/legal";
import { getCurrentBriefConsentRevision } from "@/config/brief-consent";

export const metadata = { title: "Согласие на обработку персональных данных для заявки" };

export default function BriefConsentPage() {
  const revision = getCurrentBriefConsentRevision();
  return <LegalDocument title={revision.title} lead={revision.lead} version={revision.version} effectiveDate={revision.effectiveDate} sections={structuredLegalSections(revision.sections)} />;
}
