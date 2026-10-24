CREATE TABLE "analytics_consent_events" (
    "id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "choice" VARCHAR(16) NOT NULL,
    "policy_version" VARCHAR(32) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "analytics_consent_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_consent_events_choice_check" CHECK ("choice" IN ('allowed', 'necessary', 'revoked'))
);
CREATE INDEX "analytics_consent_events_visitor_id_occurred_at_idx" ON "analytics_consent_events"("visitor_id", "occurred_at");
CREATE INDEX "analytics_consent_events_expires_at_idx" ON "analytics_consent_events"("expires_at");
