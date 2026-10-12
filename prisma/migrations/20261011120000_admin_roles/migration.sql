ALTER TABLE "admin_users" ADD COLUMN "role" VARCHAR(16) NOT NULL DEFAULT 'owner';
ALTER TABLE "admin_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_check" CHECK ("role" IN ('owner', 'operator'));
