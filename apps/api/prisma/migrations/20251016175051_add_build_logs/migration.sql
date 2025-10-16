-- CreateTable
CREATE TABLE "BuildLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "deployId" TEXT,
    "framework" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "exitCode" INTEGER,
    "stdout" TEXT NOT NULL,
    "stderr" TEXT,
    "duration" INTEGER,
    "warnings" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "nodeVersion" TEXT,
    "packageManager" TEXT,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "outputDir" TEXT,

    CONSTRAINT "BuildLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildLog_siteId_startedAt_idx" ON "BuildLog"("siteId", "startedAt");

-- CreateIndex
CREATE INDEX "BuildLog_deployId_idx" ON "BuildLog"("deployId");

-- CreateIndex
CREATE INDEX "BuildLog_status_idx" ON "BuildLog"("status");

-- AddForeignKey
ALTER TABLE "BuildLog" ADD CONSTRAINT "BuildLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildLog" ADD CONSTRAINT "BuildLog_deployId_fkey" FOREIGN KEY ("deployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
