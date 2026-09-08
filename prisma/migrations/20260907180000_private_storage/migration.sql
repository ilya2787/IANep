-- AlterTable
ALTER TABLE "version_materials" ADD COLUMN     "fileId" UUID;

-- AlterTable
ALTER TABLE "project_materials" ADD COLUMN     "fileId" UUID;

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "authorId" UUID NOT NULL,
    "authorSide" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stored_files_projectId_createdAt_idx" ON "stored_files"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "version_materials" ADD CONSTRAINT "version_materials_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "client_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

