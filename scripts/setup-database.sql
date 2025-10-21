-- ============================================================================
-- Brail Platform - Complete Database Setup Script
-- ============================================================================
-- This script creates all necessary tables and relationships for Brail.
-- 
-- Prerequisites:
--   - PostgreSQL 14 or higher
--   - Database created (e.g., CREATE DATABASE brail;)
--
-- Usage:
--   psql -U postgres -d brail -f scripts/setup-database.sql
--
-- Or using environment:
--   psql $DATABASE_URL -f scripts/setup-database.sql
-- ============================================================================

-- Enable UUID extension (optional, but recommended)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Core Tables: Users & Organizations
-- ============================================================================

-- Users table (authentication managed separately via magic links)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Organizations for team collaboration
CREATE TABLE IF NOT EXISTS "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- Organization membership (many-to-many relationship)
CREATE TABLE IF NOT EXISTS "OrgMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS "OrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, cancelled, expired
    "token" TEXT NOT NULL,
    "invitedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Sites & Deployments
-- ============================================================================

-- Sites (projects/applications to be deployed)
CREATE TABLE IF NOT EXISTS "Site" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeDeployId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- Deployments (file uploads and builds)
CREATE TABLE IF NOT EXISTS "Deploy" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading', -- uploading, uploaded, active, failed
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "byteSize" BIGINT NOT NULL DEFAULT 0,
    "isPatch" BOOLEAN NOT NULL DEFAULT false,
    "baseDeployId" TEXT, -- for patch deploys
    "comment" TEXT,
    "deployedBy" TEXT,
    "deployedByEmail" TEXT,
    "duration" INTEGER, -- deployment duration in ms
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deploy_pkey" PRIMARY KEY ("id")
);

-- Patch deployments (incremental file updates)
CREATE TABLE IF NOT EXISTS "Patch" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "baseDeployId" TEXT NOT NULL,
    "newDeployId" TEXT NOT NULL,
    "summary" JSONB NOT NULL, -- {added:[], replaced:[], deleted:[]}
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Adapter Configuration & Releases
-- ============================================================================

-- Connection profiles (saved adapter configurations)
CREATE TABLE IF NOT EXISTS "ConnectionProfile" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapter" TEXT NOT NULL, -- ssh-rsync, s3, vercel, cloudflare-pages, etc.
    "configEnc" JSONB NOT NULL, -- encrypted adapter config
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConnectionProfile_pkey" PRIMARY KEY ("id")
);

-- Releases (deployments to specific adapters/platforms)
CREATE TABLE IF NOT EXISTS "Release" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "deployId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "destinationRef" TEXT, -- adapter-specific reference
    "status" TEXT NOT NULL DEFAULT 'staged', -- staged, active, failed
    "target" TEXT NOT NULL DEFAULT 'preview', -- preview, production
    "platformDeploymentId" TEXT, -- platform-specific ID
    "previewUrl" TEXT, -- preview URL from platform
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Custom Domains & SSL
-- ============================================================================

-- Custom domains
CREATE TABLE IF NOT EXISTS "Domain" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, verified, securing, active, failed
    "cnameTarget" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "certProvider" TEXT, -- acme (Let's Encrypt)
    "certStatus" TEXT, -- pending, issued, failed
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- SSL certificates
CREATE TABLE IF NOT EXISTS "SslCertificate" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "certPem" TEXT NOT NULL, -- full certificate chain
    "keyPem" TEXT NOT NULL, -- private key (encrypted)
    "accountKey" TEXT, -- ACME account key (encrypted)
    "orderUrl" TEXT, -- ACME order URL
    "issuer" TEXT, -- e.g., "Let's Encrypt"
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, active, expiring, expired, failed
    "lastError" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "renewedFrom" TEXT, -- previous certificate ID
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SslCertificate_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- API Tokens & Authentication
-- ============================================================================

-- Personal access tokens
CREATE TABLE IF NOT EXISTS "Token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT, -- optional: scope to specific site
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL, -- bcrypt hash
    "scopes" TEXT[], -- permissions: deploy:write, site:read, etc.
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Environment Variables
-- ============================================================================

-- Environment variables (encrypted)
CREATE TABLE IF NOT EXISTS "EnvVar" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "scope" TEXT NOT NULL, -- build, runtime:preview, runtime:production, adapter:*
    "key" TEXT NOT NULL,
    "valueEnc" TEXT NOT NULL, -- AES-256-GCM encrypted
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnvVar_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Build System
-- ============================================================================

-- Build logs
CREATE TABLE IF NOT EXISTS "BuildLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "deployId" TEXT,
    "framework" TEXT NOT NULL, -- next, astro, vite, etc.
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running', -- running, success, failed, cancelled
    "exitCode" INTEGER,
    "stdout" TEXT NOT NULL,
    "stderr" TEXT,
    "duration" INTEGER, -- ms
    "warnings" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "nodeVersion" TEXT,
    "packageManager" TEXT, -- npm, pnpm, yarn
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "outputDir" TEXT,
    CONSTRAINT "BuildLog_pkey" PRIMARY KEY ("id")
);

-- Build cache for faster rebuilds
CREATE TABLE IF NOT EXISTS "BuildCache" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lockHash" TEXT NOT NULL, -- sha256 of package-lock/pnpm-lock/yarn.lock
    "framework" TEXT NOT NULL,
    "nodeVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    CONSTRAINT "BuildCache_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Logging & Auditing
-- ============================================================================

-- Deployment logs (real-time streaming logs)
CREATE TABLE IF NOT EXISTS "DeploymentLog" (
    "id" TEXT NOT NULL,
    "deployId" TEXT NOT NULL,
    "level" TEXT NOT NULL, -- info, error, debug, warn
    "message" TEXT NOT NULL,
    "metadata" TEXT, -- JSON string
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeploymentLog_pkey" PRIMARY KEY ("id")
);

-- Audit events (security and compliance tracking)
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "deployId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL, -- deploy.created, deploy.activated, rollback, etc.
    "ipHash" TEXT, -- anonymized IP
    "userAgent" TEXT,
    "country" TEXT, -- ISO-2
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- User indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Organization indexes
CREATE INDEX IF NOT EXISTS "OrgMember_userId_idx" ON "OrgMember"("userId");
CREATE INDEX IF NOT EXISTS "OrgMember_orgId_idx" ON "OrgMember"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrgMember_userId_orgId_key" ON "OrgMember"("userId", "orgId");

CREATE UNIQUE INDEX IF NOT EXISTS "OrgInvite_token_key" ON "OrgInvite"("token");
CREATE INDEX IF NOT EXISTS "OrgInvite_orgId_idx" ON "OrgInvite"("orgId");
CREATE INDEX IF NOT EXISTS "OrgInvite_email_status_idx" ON "OrgInvite"("email", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "OrgInvite_orgId_email_key" ON "OrgInvite"("orgId", "email");

-- Site indexes
CREATE INDEX IF NOT EXISTS "Site_orgId_idx" ON "Site"("orgId");

-- Deploy indexes
CREATE INDEX IF NOT EXISTS "Deploy_siteId_idx" ON "Deploy"("siteId");
CREATE INDEX IF NOT EXISTS "Deploy_createdAt_idx" ON "Deploy"("createdAt");

-- Patch indexes
CREATE INDEX IF NOT EXISTS "Patch_siteId_idx" ON "Patch"("siteId");
CREATE INDEX IF NOT EXISTS "Patch_newDeployId_idx" ON "Patch"("newDeployId");
CREATE INDEX IF NOT EXISTS "Patch_createdAt_idx" ON "Patch"("createdAt");

-- Domain indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Domain_hostname_key" ON "Domain"("hostname");
CREATE INDEX IF NOT EXISTS "Domain_siteId_idx" ON "Domain"("siteId");

-- SSL Certificate indexes
CREATE INDEX IF NOT EXISTS "SslCertificate_domainId_idx" ON "SslCertificate"("domainId");
CREATE INDEX IF NOT EXISTS "SslCertificate_hostname_idx" ON "SslCertificate"("hostname");
CREATE INDEX IF NOT EXISTS "SslCertificate_expiresAt_idx" ON "SslCertificate"("expiresAt");
CREATE INDEX IF NOT EXISTS "SslCertificate_status_idx" ON "SslCertificate"("status");

-- Token indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Token_hash_key" ON "Token"("hash");
CREATE INDEX IF NOT EXISTS "Token_userId_idx" ON "Token"("userId");
CREATE INDEX IF NOT EXISTS "Token_hash_idx" ON "Token"("hash");

-- Connection Profile indexes
CREATE INDEX IF NOT EXISTS "ConnectionProfile_siteId_idx" ON "ConnectionProfile"("siteId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConnectionProfile_siteId_name_key" ON "ConnectionProfile"("siteId", "name");

-- Release indexes
CREATE INDEX IF NOT EXISTS "Release_siteId_idx" ON "Release"("siteId");
CREATE INDEX IF NOT EXISTS "Release_deployId_idx" ON "Release"("deployId");
CREATE INDEX IF NOT EXISTS "Release_createdAt_idx" ON "Release"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Release_siteId_deployId_adapter_key" ON "Release"("siteId", "deployId", "adapter");

-- Environment Variable indexes
CREATE INDEX IF NOT EXISTS "EnvVar_siteId_idx" ON "EnvVar"("siteId");
CREATE INDEX IF NOT EXISTS "EnvVar_siteId_scope_idx" ON "EnvVar"("siteId", "scope");
CREATE INDEX IF NOT EXISTS "EnvVar_orgId_idx" ON "EnvVar"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "EnvVar_siteId_scope_key_key" ON "EnvVar"("siteId", "scope", "key");

-- Build Log indexes
CREATE INDEX IF NOT EXISTS "BuildLog_siteId_startedAt_idx" ON "BuildLog"("siteId", "startedAt");
CREATE INDEX IF NOT EXISTS "BuildLog_deployId_idx" ON "BuildLog"("deployId");
CREATE INDEX IF NOT EXISTS "BuildLog_status_idx" ON "BuildLog"("status");

-- Build Cache indexes
CREATE INDEX IF NOT EXISTS "BuildCache_siteId_lockHash_idx" ON "BuildCache"("siteId", "lockHash");

-- Deployment Log indexes
CREATE INDEX IF NOT EXISTS "DeploymentLog_deployId_idx" ON "DeploymentLog"("deployId");
CREATE INDEX IF NOT EXISTS "DeploymentLog_timestamp_idx" ON "DeploymentLog"("timestamp");

-- Audit Event indexes
CREATE INDEX IF NOT EXISTS "AuditEvent_siteId_createdAt_idx" ON "AuditEvent"("siteId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_deployId_idx" ON "AuditEvent"("deployId");

-- ============================================================================
-- Foreign Key Constraints
-- ============================================================================

-- Organization relationships
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" 
    FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_orgId_fkey" 
    FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Site relationships
ALTER TABLE "Site" ADD CONSTRAINT "Site_orgId_fkey" 
    FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deploy relationships
ALTER TABLE "Deploy" ADD CONSTRAINT "Deploy_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Patch relationships
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_baseDeployId_fkey" 
    FOREIGN KEY ("baseDeployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Patch" ADD CONSTRAINT "Patch_newDeployId_fkey" 
    FOREIGN KEY ("newDeployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain relationships
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SslCertificate" ADD CONSTRAINT "SslCertificate_domainId_fkey" 
    FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Token relationships
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Connection Profile relationships
ALTER TABLE "ConnectionProfile" ADD CONSTRAINT "ConnectionProfile_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Release relationships
ALTER TABLE "Release" ADD CONSTRAINT "Release_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Release" ADD CONSTRAINT "Release_deployId_fkey" 
    FOREIGN KEY ("deployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Environment Variable relationships
ALTER TABLE "EnvVar" ADD CONSTRAINT "EnvVar_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Build Log relationships
ALTER TABLE "BuildLog" ADD CONSTRAINT "BuildLog_siteId_fkey" 
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuildLog" ADD CONSTRAINT "BuildLog_deployId_fkey" 
    FOREIGN KEY ("deployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deployment Log relationships
ALTER TABLE "DeploymentLog" ADD CONSTRAINT "DeploymentLog_deployId_fkey" 
    FOREIGN KEY ("deployId") REFERENCES "Deploy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Prisma Migration Tracking
-- ============================================================================

-- Create Prisma migrations table (for Prisma compatibility)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Insert migration record
INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
VALUES (
    'manual-setup-' || to_char(now(), 'YYYYMMDDHH24MISS'),
    'manual-database-setup',
    'manual_database_setup',
    now(),
    1
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Next steps:
--   1. Update your .env file with DATABASE_URL
--   2. Generate encryption keys: node scripts/generate-key.js
--   3. Start the API: pnpm dev
--   4. Create your first user via the web UI
-- ============================================================================

