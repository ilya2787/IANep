-- Request kind is needed during processing but is not part of the completed receipt.
ALTER TABLE "personal_data_requests" ALTER COLUMN "kind" DROP NOT NULL;
