-- Completed privacy-request receipts are retained for three calendar years from
-- execution. completedAt is the authoritative instant at which destruction was
-- committed. Existing completed rows therefore have an exact, safe baseline.
ALTER TABLE "personal_data_requests"
  ADD COLUMN "receiptExpiresAt" TIMESTAMP(3),
  ADD COLUMN "receiptPurgedAt" TIMESTAMP(3);

UPDATE "personal_data_requests"
SET "receiptExpiresAt" = "completedAt" + INTERVAL '3 years'
WHERE "completedAt" IS NOT NULL;

ALTER TABLE "personal_data_requests"
  ALTER COLUMN "scope" DROP NOT NULL,
  ALTER COLUMN "receivedAt" DROP NOT NULL,
  ALTER COLUMN "channel" DROP NOT NULL;

CREATE INDEX "personal_data_requests_receiptExpiresAt_receiptPurgedAt_idx"
ON "personal_data_requests"("receiptExpiresAt", "receiptPurgedAt");
