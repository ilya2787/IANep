ALTER TABLE "admin_users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationAttemptStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "recipientClientId" UUID,
  "recipientAdminId" UUID,
  "projectId" UUID,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_one_recipient" CHECK (("recipientClientId" IS NOT NULL) <> ("recipientAdminId" IS NOT NULL))
);

CREATE TABLE "notification_attempts" (
  "id" UUID NOT NULL,
  "notificationId" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "lastError" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_recipientClientId_readAt_createdAt_idx" ON "notifications"("recipientClientId", "readAt", "createdAt");
CREATE INDEX "notifications_recipientAdminId_readAt_createdAt_idx" ON "notifications"("recipientAdminId", "readAt", "createdAt");
CREATE UNIQUE INDEX "notification_attempts_notificationId_channel_key" ON "notification_attempts"("notificationId", "channel");
CREATE INDEX "notification_attempts_status_nextAttemptAt_idx" ON "notification_attempts"("status", "nextAttemptAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientClientId_fkey" FOREIGN KEY ("recipientClientId") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientAdminId_fkey" FOREIGN KEY ("recipientAdminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
