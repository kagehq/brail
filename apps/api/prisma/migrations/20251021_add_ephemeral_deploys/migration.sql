-- Add ephemeral/TTL support for sandboxes
ALTER TABLE "Deploy" ADD COLUMN "isEphemeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Deploy" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Deploy" ADD COLUMN "metadata" TEXT; -- JSON metadata for sandbox config

-- Add index for cleanup job
CREATE INDEX "Deploy_isEphemeral_expiresAt_idx" ON "Deploy"("isEphemeral", "expiresAt");

