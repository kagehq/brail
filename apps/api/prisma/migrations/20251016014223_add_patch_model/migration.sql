-- AlterTable
ALTER TABLE "Deploy" ADD COLUMN     "baseDeployId" TEXT,
ADD COLUMN     "isPatch" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Patch" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "baseDeployId" TEXT NOT NULL,
    "newDeployId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patch_siteId_idx" ON "Patch"("siteId");

-- CreateIndex
CREATE INDEX "Patch_newDeployId_idx" ON "Patch"("newDeployId");

-- CreateIndex
CREATE INDEX "Patch_createdAt_idx" ON "Patch"("createdAt");

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_baseDeployId_fkey" FOREIGN KEY ("baseDeployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_newDeployId_fkey" FOREIGN KEY ("newDeployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
