-- CreateTable
CREATE TABLE "EnvVar" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEnc" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvVar_siteId_idx" ON "EnvVar"("siteId");

-- CreateIndex
CREATE INDEX "EnvVar_siteId_scope_idx" ON "EnvVar"("siteId", "scope");

-- CreateIndex
CREATE INDEX "EnvVar_orgId_idx" ON "EnvVar"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvVar_siteId_scope_key_key" ON "EnvVar"("siteId", "scope", "key");

-- AddForeignKey
ALTER TABLE "EnvVar" ADD CONSTRAINT "EnvVar_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
