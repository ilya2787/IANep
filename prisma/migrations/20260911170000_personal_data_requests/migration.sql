-- CreateEnum
CREATE TYPE "PersonalDataRequestKind" AS ENUM ('CONSENT_WITHDRAWAL', 'ERASURE', 'PROCESSING_TERMINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonalDataRequestScope" AS ENUM ('BRIEF', 'PROJECT', 'CLIENT');

-- CreateEnum
CREATE TYPE "PersonalDataRequestStatus" AS ENUM ('REGISTERED', 'READY', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'REJECTED');

-- CreateEnum
CREATE TYPE "PersonalDataRequestResult" AS ENUM ('DESTROYED', 'PARTIALLY_PRESERVED', 'NOT_DESTROYED');

-- CreateTable
CREATE TABLE "personal_data_requests" (
    "id" UUID NOT NULL,
    "public_number" SERIAL NOT NULL,
    "kind" "PersonalDataRequestKind" NOT NULL,
    "scope" "PersonalDataRequestScope" NOT NULL,
    "status" "PersonalDataRequestStatus" NOT NULL DEFAULT 'REGISTERED',
    "targetId" UUID,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "excludedCategories" JSONB,
    "exclusionReason" VARCHAR(1000),
    "destroyedCategories" JSONB,
    "result" "PersonalDataRequestResult",
    "storageWarnings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_data_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personal_data_requests_public_number_key" ON "personal_data_requests"("public_number");
CREATE INDEX "personal_data_requests_status_receivedAt_idx" ON "personal_data_requests"("status", "receivedAt");
CREATE INDEX "personal_data_requests_scope_targetId_idx" ON "personal_data_requests"("scope", "targetId");
