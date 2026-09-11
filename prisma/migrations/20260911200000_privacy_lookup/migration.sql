-- The lookup key is a keyed HMAC digest. The server secret is never stored in PostgreSQL.
CREATE TYPE "PersonalDataRequestChannel" AS ENUM ('EMAIL', 'PHONE', 'IN_PERSON', 'OTHER');

ALTER TABLE "personal_data_requests"
ADD COLUMN "channel" "PersonalDataRequestChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN "lookupKey" CHAR(64);

CREATE INDEX "personal_data_requests_lookupKey_completedAt_idx"
ON "personal_data_requests"("lookupKey", "completedAt");
