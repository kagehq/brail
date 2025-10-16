/*
  Warnings:

  - Added the required column `cnameTarget` to the `Domain` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Domain` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "certProvider" TEXT,
ADD COLUMN     "certStatus" TEXT,
ADD COLUMN     "cnameTarget" TEXT NOT NULL,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "BuildCache" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lockHash" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "nodeVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "BuildCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildCache_siteId_lockHash_idx" ON "BuildCache"("siteId", "lockHash");
