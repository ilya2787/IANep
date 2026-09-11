ALTER TYPE "PersonalDataRequestChannel" ADD VALUE IF NOT EXISTS 'FORM';
ALTER TYPE "PersonalDataRequestChannel" ADD VALUE IF NOT EXISTS 'WRITTEN';

CREATE TYPE "PrivacyLookupType" AS ENUM ('EMAIL', 'PHONE', 'NONE');
CREATE TYPE "BriefContactType" AS ENUM ('EMAIL', 'PHONE', 'TELEGRAM');

ALTER TABLE "personal_data_requests"
  ADD COLUMN "lookupHash" CHAR(64),
  ADD COLUMN "lookupType" "PrivacyLookupType" NOT NULL DEFAULT 'NONE';
UPDATE "personal_data_requests"
SET "lookupHash" = "lookupKey",
    "lookupType" = 'EMAIL'
WHERE "lookupKey" IS NOT NULL;

CREATE INDEX "personal_data_requests_lookupType_lookupHash_completedAt_idx"
ON "personal_data_requests"("lookupType", "lookupHash", "completedAt");

ALTER TABLE "brief_requests"
  ADD COLUMN "contactType" "BriefContactType";
UPDATE "brief_requests"
SET "contactType" = CASE
  WHEN "answers"->>'contactMethod' = 'Email' THEN 'EMAIL'::"BriefContactType"
  WHEN "answers"->>'contactMethod' = 'Телефон' THEN 'PHONE'::"BriefContactType"
  WHEN "answers"->>'contactMethod' = 'Telegram' THEN 'TELEGRAM'::"BriefContactType"
  ELSE NULL
END;
