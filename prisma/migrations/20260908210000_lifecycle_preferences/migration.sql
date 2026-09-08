ALTER TABLE "client_users" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "client_users" ADD COLUMN "notificationPreferences" JSONB;
ALTER TABLE "brief_requests" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "brief_requests" ADD COLUMN "deleteAfter" TIMESTAMP(3);
ALTER TABLE "stored_files" ADD COLUMN "physicalDeletedAt" TIMESTAMP(3);
ALTER TABLE "stored_files" ADD COLUMN "deletionReason" TEXT;

CREATE INDEX "brief_requests_archivedAt_deleteAfter_idx" ON "brief_requests"("archivedAt", "deleteAfter");

CREATE TABLE "system_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "archivedProjectRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "archivedBriefRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "cleanupWarningDays" INTEGER NOT NULL DEFAULT 30,
  "automaticCleanupEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "system_settings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
