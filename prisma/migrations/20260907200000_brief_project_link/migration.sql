-- AlterEnum
ALTER TYPE "BriefRequestStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "client_projects" ADD COLUMN     "briefId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "client_projects_briefId_key" ON "client_projects"("briefId");

-- AddForeignKey
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "brief_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

