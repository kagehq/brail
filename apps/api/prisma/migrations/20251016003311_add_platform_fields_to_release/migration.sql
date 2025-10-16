-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "platformDeploymentId" TEXT,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "target" TEXT NOT NULL DEFAULT 'preview';
