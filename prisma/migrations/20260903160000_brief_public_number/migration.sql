ALTER TABLE "brief_requests" ADD COLUMN "public_number" SERIAL NOT NULL;
CREATE UNIQUE INDEX "brief_requests_public_number_key" ON "brief_requests"("public_number");
