-- CreateTable
CREATE TABLE "SslCertificate" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "certPem" TEXT NOT NULL,
    "keyPem" TEXT NOT NULL,
    "accountKey" TEXT,
    "orderUrl" TEXT,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastError" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "renewedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SslCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SslCertificate_domainId_idx" ON "SslCertificate"("domainId");

-- CreateIndex
CREATE INDEX "SslCertificate_hostname_idx" ON "SslCertificate"("hostname");

-- CreateIndex
CREATE INDEX "SslCertificate_expiresAt_idx" ON "SslCertificate"("expiresAt");

-- CreateIndex
CREATE INDEX "SslCertificate_status_idx" ON "SslCertificate"("status");

-- AddForeignKey
ALTER TABLE "SslCertificate" ADD CONSTRAINT "SslCertificate_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
