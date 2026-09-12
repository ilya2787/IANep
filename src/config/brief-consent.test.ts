import assert from "node:assert/strict";
import test from "node:test";
import {
  BRIEF_CONSENT_REVISIONS,
  findBriefConsentRevision,
  getBriefConsentRevision,
  getCurrentBriefConsentRevision,
  type BriefConsentRevision,
} from "./brief-consent";
import { LEGAL_DOCUMENTS } from "./legal";

test("публичная редакция согласия берётся из архивного реестра", () => {
  const current = getCurrentBriefConsentRevision();
  assert.strictEqual(current, BRIEF_CONSENT_REVISIONS[LEGAL_DOCUMENTS.briefConsent.version]);
  assert.equal(current.effectiveDate, LEGAL_DOCUMENTS.briefConsent.effectiveDate);
  assert.ok(current.sections.length > 0);
});

test("редакция 1.0 остаётся доступной при добавлении более новой", () => {
  const versionOne = getBriefConsentRevision("1.0");
  assert.ok(versionOne);
  const simulatedVersionTwo: BriefConsentRevision = { ...versionOne, version: "2.0", effectiveDate: "1 января 2027 года" };
  const expandedRegistry = { ...BRIEF_CONSENT_REVISIONS, "2.0": simulatedVersionTwo };
  assert.strictEqual(findBriefConsentRevision(expandedRegistry, "1.0"), versionOne);
  assert.strictEqual(findBriefConsentRevision(expandedRegistry, "2.0"), simulatedVersionTwo);
});

test("неизвестная версия не подменяется текущей", () => {
  assert.equal(getBriefConsentRevision("неизвестная-версия"), undefined);
});
