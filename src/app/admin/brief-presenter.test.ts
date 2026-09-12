import assert from "node:assert/strict";
import test from "node:test";
import { briefConsentEvidenceLabel } from "./brief-presenter";

test("старая заявка без доказательства согласия отображается честно", () => {
  assert.equal(briefConsentEvidenceLabel(null, null), "Нет подтверждающих сведений");
  assert.equal(briefConsentEvidenceLabel(new Date(), null), "Нет подтверждающих сведений");
  assert.equal(briefConsentEvidenceLabel(null, "1.0"), "Нет подтверждающих сведений");
});
