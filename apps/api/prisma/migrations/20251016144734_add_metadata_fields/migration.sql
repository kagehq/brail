/*
  Warnings:

  - Added the required column `updatedAt` to the `Deploy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deploy" ADD COLUMN     "deployedBy" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Set updatedAt to createdAt for existing rows
UPDATE "Deploy" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt required
ALTER TABLE "Deploy" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Set updatedAt to createdAt for existing rows
UPDATE "Release" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt required
ALTER TABLE "Release" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Set updatedAt to createdAt for existing rows
UPDATE "Site" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make updatedAt required
ALTER TABLE "Site" ALTER COLUMN "updatedAt" SET NOT NULL;
