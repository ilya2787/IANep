-- The registration timestamp belongs to the three-year receipt and is removed
-- when the row becomes an unlinkable technical tombstone.
ALTER TABLE "personal_data_requests" ALTER COLUMN "createdAt" DROP NOT NULL;
