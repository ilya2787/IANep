ALTER TABLE "client_projects"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "deleteAfter" TIMESTAMP(3);

CREATE INDEX "client_projects_archivedAt_deleteAfter_idx"
ON "client_projects"("archivedAt", "deleteAfter");
