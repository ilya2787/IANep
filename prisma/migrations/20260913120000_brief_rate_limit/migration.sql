CREATE TABLE "brief_rate_limit_attempts" (
    "id" UUID NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brief_rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brief_rate_limit_attempts_key_hash_attempted_at_idx"
ON "brief_rate_limit_attempts"("key_hash", "attempted_at");

CREATE INDEX "brief_rate_limit_attempts_attempted_at_idx"
ON "brief_rate_limit_attempts"("attempted_at");
