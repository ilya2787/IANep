-- Existing rows intentionally remain NULL: this migration must not invent consent evidence.
ALTER TABLE "brief_requests"
  ADD COLUMN "consent_accepted_at" TIMESTAMP(3),
  ADD COLUMN "consent_version" VARCHAR(50);

ALTER TABLE "brief_requests"
  ADD CONSTRAINT "brief_requests_consent_evidence_pair"
  CHECK (("consent_accepted_at" IS NULL) = ("consent_version" IS NULL));
