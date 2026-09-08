-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PREPARATION', 'IN_PROGRESS', 'IN_REVIEW', 'REVISION', 'COMPLETED', 'WARRANTY');

-- CreateEnum
CREATE TYPE "MaterialKind" AS ENUM ('IMAGE', 'DOCUMENT', 'FILE', 'LINK');

-- CreateEnum
CREATE TYPE "DecisionKind" AS ENUM ('ACCEPTED', 'CHANGES');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PLANNED', 'DUE', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "client_users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_projects" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "WorkStatus" NOT NULL DEFAULT 'PREPARATION',
    "nextAction" TEXT NOT NULL DEFAULT '',
    "launchedAt" DATE,
    "warrantyDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stages" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PREPARATION',
    "includedRounds" INTEGER NOT NULL DEFAULT 2,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_versions" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" UUID NOT NULL,

    CONSTRAINT "stage_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_materials" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "version_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_decisions" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "kind" "DecisionKind" NOT NULL,
    "changes" TEXT NOT NULL DEFAULT '',
    "countsTowardLimit" BOOLEAN NOT NULL DEFAULT true,
    "exceptionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_materials" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "stageId" UUID,
    "kind" "MaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "authorSide" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_payments" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PLANNED',
    "dueAt" DATE,
    "paidAt" DATE,
    "documentUrl" TEXT,

    CONSTRAINT "project_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_events" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "actorSide" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_users_username_key" ON "client_users"("username");

-- CreateIndex
CREATE INDEX "client_projects_clientId_updatedAt_idx" ON "client_projects"("clientId", "updatedAt");

-- CreateIndex
CREATE INDEX "project_stages_projectId_position_idx" ON "project_stages"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "stage_versions_stageId_number_key" ON "stage_versions"("stageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "stage_decisions_versionId_key" ON "stage_decisions"("versionId");

-- CreateIndex
CREATE INDEX "project_materials_projectId_createdAt_idx" ON "project_materials"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "project_payments_projectId_dueAt_idx" ON "project_payments"("projectId", "dueAt");

-- CreateIndex
CREATE INDEX "project_events_projectId_createdAt_idx" ON "project_events"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_versions" ADD CONSTRAINT "stage_versions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "project_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_materials" ADD CONSTRAINT "version_materials_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "stage_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_decisions" ADD CONSTRAINT "stage_decisions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "stage_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_decisions" ADD CONSTRAINT "stage_decisions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "project_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_payments" ADD CONSTRAINT "project_payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "client_projects" ADD CONSTRAINT "warranty_thirty_days" CHECK ("warrantyDays" = 30);
ALTER TABLE "project_stages" ADD CONSTRAINT "included_rounds_nonnegative" CHECK ("includedRounds" >= 0);
ALTER TABLE "project_payments" ADD CONSTRAINT "payment_positive" CHECK ("amount" > 0);
ALTER TABLE "stage_decisions" ADD CONSTRAINT "changes_required" CHECK ("kind" <> 'CHANGES' OR length(trim("changes")) > 0);
