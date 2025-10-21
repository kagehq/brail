# Brail Platform - Complete Technical Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [CLI Reference](#cli-reference)
6. [SDK Reference](#sdk-reference)
7. [Web Dashboard](#web-dashboard)
8. [Adapters](#adapters)
9. [Templates](#templates)
10. [Deployment Workflow](#deployment-workflow)
11. [Security & Authentication](#security--authentication)
12. [Database Schema](#database-schema)
13. [Configuration](#configuration)
14. [Development Guide](#development-guide)

---

## Overview

**Brail** is a modern deployment platform that combines the simplicity of FileZilla with enterprise-grade features like zero-downtime deployments, instant rollbacks, and multi-platform support. It's designed for teams who want full control over their deployments without vendor lock-in.

### Key Features

- **Deploy Anywhere**: SSH/FTP, S3, Vercel, Cloudflare, Railway, Fly.io, Render, GitHub Pages, Netlify
- **Zero Downtime**: Atomic deployments with health checks and instant rollbacks
- **Live Patching**: Update individual files or directories without full redeployment
- **Multi-Environment**: Preview and production deployments with promotion workflows
- **Framework Support**: Auto-detection and building for Next.js, Astro, Vite, Nuxt, SvelteKit, TanStack
- **Custom Domains**: Built-in SSL/TLS certificates via Let's Encrypt
- **Audit Trail**: Complete deployment history with who, what, when
- **Team Collaboration**: Organization-based access control
- **Sandboxes**: Vercel and Cloudflare sandboxes for dynamic applications
- **Programmatic SDK**: Deploy in a few lines of JavaScript/TypeScript
- **Templates**: Pre-built sites for instant deployment
- **Visual Adapter Builder**: Create custom adapters without CLI

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Brail Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web UI     │  │   CLI Tool   │  │   SDK        │      │
│  │  (Nuxt/Vue)  │  │ (Commander)  │  │ (TypeScript) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            │                                  │
│                   ┌────────▼────────┐                        │
│                   │   REST API      │                        │
│                   │   (NestJS)      │                        │
│                   └────────┬────────┘                        │
│                            │                                  │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│    ┌────▼─────┐    ┌──────▼──────┐    ┌─────▼────┐        │
│    │ Postgres │    │   Storage   │    │ Adapters │        │
│    │  (Prisma)│    │   (Local)   │    │ Registry │        │
│    └──────────┘    └─────────────┘    └──────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Nuxt 3 + Vue 3 + TypeScript
- Tailwind CSS for styling
- WebSocket for real-time logs

**Backend:**
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL database
- JWT & Bearer token authentication

**CLI:**
- Commander.js
- Node.js streams for file uploads
- Chalk for colored output

**Published NPM Packages:**
- **[@brailhq/cli](https://www.npmjs.com/package/@brailhq/cli)** - Command-line interface (`npm install -g @brailhq/cli`)
- **[@brailhq/sdk](https://www.npmjs.com/package/@brailhq/sdk)** - Programmatic deployment SDK (`npm install @brailhq/sdk`)
- **[@brailhq/adapter-kit](https://www.npmjs.com/package/@brailhq/adapter-kit)** - SDK for building custom adapters (`npm install @brailhq/adapter-kit`)
- **[create-br-adapter](https://www.npmjs.com/package/create-br-adapter)** - Adapter scaffolder (`npx create-br-adapter my-adapter`)

**Internal Packages:**
- `@br/adapters` - Official adapter implementations (workspace-only)
- `@br/frameworks` - Framework detection and building (workspace-only)
- `@br/shared` - Shared utilities and schemas (workspace-only)
- `@br/domain-utils` - DNS utilities (workspace-only)

---

## Core Concepts

### Sites

A **Site** is the top-level entity representing a web application or static site. Each site:
- Has a unique ID (e.g., `my-awesome-site`)
- Belongs to an organization
- Contains multiple deployments
- Can have custom domains
- Has environment variables
- Maintains deployment history

### Deployments

A **Deploy** represents a snapshot of your site at a specific point in time:
- Immutable once uploaded
- Contains all files and metadata
- Has a unique hash based on contents
- Can be activated, rolled back, or deleted
- Tracks who deployed and when

**Deployment States:**
- `pending` - Upload in progress
- `uploaded` - Files uploaded, ready to activate
- `active` - Currently live
- `inactive` - Superseded by newer deployment
- `failed` - Deployment failed

### Releases

A **Release** represents a deployment pushed to a specific adapter (destination):
- Links a deployment to an adapter profile
- Has `preview` or `production` target
- Maintains external deployment info (URLs, IDs)
- Enables rollbacks on specific platforms
- Tracks activation state per adapter

### Profiles

**Connection Profiles** store adapter credentials and configuration:
- Reusable across deployments
- Encrypted credentials
- Default profile per site
- Supports all adapter types
- Can be shared across sites in same org

### Patches

**Live Patches** enable file-level updates without full redeployment:
- Replace single files or directories
- Delete specific paths
- Based on current active deployment
- Creates new deployment when activated
- Perfect for hotfixes

### Adapters

**Adapters** are plugins that handle platform-specific deployment logic:
- Implement standard interface (`@brailhq/adapter-kit`)
- Handle upload, activation, and rollback
- Support both static and dynamic platforms
- Can be built visually or via CLI
- Registered in global registry

---

## API Reference

Base URL: `http://localhost:3000/v1`

### Authentication

All API endpoints require authentication via:
- **JWT Cookie**: Set via `/v1/auth/login`
- **Bearer Token**: `Authorization: Bearer <token>`

#### POST `/v1/auth/login`
Login with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

#### GET `/v1/auth/me`
Get current user

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "orgId": "org-id"
}
```

#### POST `/v1/auth/logout`
Logout current user

---

### Sites

#### POST `/v1/sites`
Create a new site

**Request:**
```json
{
  "name": "my-site"
}
```

**Response:**
```json
{
  "id": "my-site",
  "name": "my-site",
  "orgId": "org-id",
  "createdAt": "2025-10-21T00:00:00.000Z"
}
```

#### GET `/v1/sites`
List all sites for current user

**Response:**
```json
[
  {
    "id": "my-site",
    "name": "my-site",
    "orgId": "org-id",
    "createdAt": "2025-10-21T00:00:00.000Z",
    "_count": {
      "deploys": 5,
      "domains": 1
    }
  }
]
```

#### GET `/v1/sites/:siteId`
Get site details

#### GET `/v1/sites/:siteId/deploys`
List deployments for a site

#### GET `/v1/sites/:siteId/tree`
Get file tree of active deployment

#### DELETE `/v1/sites/:siteId`
Delete a site (soft delete)

---

### Deployments

#### POST `/v1/sites/:siteId/deploys`
Create a new deployment

**Request (multipart/form-data):**
```
files: [File1, File2, ...]
metadata: {
  "comment": "Deploy comment",
  "framework": "next"
}
```

**Response:**
```json
{
  "id": "deploy-id",
  "siteId": "my-site",
  "status": "pending",
  "hash": "abc123",
  "createdAt": "2025-10-21T00:00:00.000Z"
}
```

#### GET `/v1/deploys/:deployId`
Get deployment details

#### PATCH `/v1/deploys/:deployId/finalize`
Mark deployment as uploaded

**Request:**
```json
{
  "comment": "Deployment complete"
}
```

#### POST `/v1/deploys/:deployId/activate`
Activate a deployment (legacy endpoint)

**Request:**
```json
{
  "comment": "Going live"
}
```

#### DELETE `/v1/deploys/:deployId`
Delete a deployment

#### POST `/v1/deploys/:deployId/fail`
Mark deployment as failed

---

### Releases

#### GET `/v1/sites/:siteId/releases`
List releases for a site

**Response:**
```json
[
  {
    "id": "release-id",
    "deployId": "deploy-id",
    "siteId": "my-site",
    "adapter": "vercel",
    "target": "production",
    "status": "active",
    "externalUrl": "https://my-site.vercel.app",
    "createdAt": "2025-10-21T00:00:00.000Z"
  }
]
```

#### POST `/v1/deploys/:deployId/stage`
Stage a release (upload to adapter)

**Request:**
```json
{
  "profileId": "profile-id",
  "adapter": "vercel",
  "config": { "token": "xxx" },
  "target": "preview"
}
```

**Response:**
```json
{
  "id": "release-id",
  "status": "staged",
  "externalUrl": "https://preview.vercel.app"
}
```

#### POST `/v1/deploys/:deployId/activate`
Activate a staged release

**Request:**
```json
{
  "profileId": "profile-id",
  "adapter": "vercel",
  "target": "production",
  "comment": "Promote to production"
}
```

#### POST `/v1/sites/:siteId/rollback`
Rollback to previous deployment

**Request:**
```json
{
  "toDeployId": "previous-deploy-id",
  "profileId": "profile-id",
  "adapter": "vercel"
}
```

#### DELETE `/v1/releases/:releaseId`
Delete a release

---

### Profiles

#### POST `/v1/sites/:siteId/profiles`
Create connection profile

**Request:**
```json
{
  "name": "production",
  "adapter": "ssh-rsync",
  "config": {
    "host": "example.com",
    "port": 22,
    "user": "deploy",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
    "basePath": "/var/www/html"
  }
}
```

#### GET `/v1/sites/:siteId/profiles`
List profiles for a site

#### GET `/v1/sites/:siteId/profiles/:profileId`
Get profile details

#### PATCH `/v1/sites/:siteId/profiles/:profileId`
Update profile

#### DELETE `/v1/sites/:siteId/profiles/:profileId`
Delete profile

#### POST `/v1/sites/:siteId/profiles/:profileId/default`
Set default profile

---

### Patches

#### POST `/v1/sites/:siteId/patches`
Create a patch

**Request (multipart/form-data):**
```
type: "replace" | "delete"
files: [File1, File2, ...]
paths: ["path1", "path2"]  // for delete
```

#### GET `/v1/sites/:siteId/patches`
List patches for a site

#### POST `/v1/patches/:patchId/activate`
Activate a patch

#### GET `/v1/patches/:patchId`
Get patch details

---

### Domains

#### POST `/v1/sites/:siteId/domains`
Add custom domain

**Request:**
```json
{
  "hostname": "example.com"
}
```

**Response:**
```json
{
  "id": "domain-id",
  "hostname": "example.com",
  "verified": false,
  "sslStatus": "pending",
  "dnsRecords": [
    {
      "type": "A",
      "name": "@",
      "value": "1.2.3.4"
    }
  ]
}
```

#### GET `/v1/sites/:siteId/domains`
List domains for a site

#### POST `/v1/domains/:domainId/verify`
Verify domain DNS

#### DELETE `/v1/domains/:domainId`
Remove domain

#### POST `/v1/domains/:domainId/ssl`
Provision SSL certificate

---

### Environment Variables

#### GET `/v1/sites/:siteId/env`
List environment variables

**Response:**
```json
[
  {
    "id": "env-id",
    "key": "API_KEY",
    "value": "secret-value",
    "target": "production"
  }
]
```

#### POST `/v1/sites/:siteId/env`
Add environment variable

**Request:**
```json
{
  "key": "API_KEY",
  "value": "secret-value",
  "target": "production"
}
```

#### PATCH `/v1/sites/:siteId/env/:envId`
Update environment variable

#### DELETE `/v1/sites/:siteId/env/:envId`
Delete environment variable

---

### Logs

#### GET `/v1/deploys/:deployId/logs`
Get deployment logs

**Response:**
```json
[
  {
    "timestamp": "2025-10-21T00:00:00.000Z",
    "level": "info",
    "message": "Starting deployment",
    "meta": {}
  }
]
```

#### WebSocket `/v1/logs`
Real-time log streaming

**Subscribe:**
```json
{
  "action": "subscribe",
  "deployId": "deploy-id"
}
```

---

### Adapters

#### GET `/v1/catalog/adapters`
List available adapters

**Response:**
```json
[
  {
    "name": "ssh-rsync",
    "title": "SSH/Rsync",
    "category": "traditional",
    "description": "Deploy via SSH with rsync",
    "features": ["Zero downtime", "Health checks", "Rollback"],
    "supportsProduction": true,
    "supportsPreview": false
  }
]
```

#### GET `/v1/adapters`
List registered adapters (same as catalog)

---

### Templates

#### GET `/v1/templates`
List available templates

**Response:**
```json
[
  {
    "id": "landing-page",
    "name": "Landing Page",
    "description": "Modern marketing landing page",
    "category": "marketing",
    "tech": ["HTML", "Tailwind", "Alpine.js"],
    "variables": [
      {
        "key": "SITE_TITLE",
        "label": "Site Title",
        "default": "My Product",
        "required": true
      }
    ]
  }
]
```

#### GET `/v1/templates/:templateId`
Get template details

#### POST `/v1/templates/:templateId/clone`
Clone template to new site

**Request:**
```json
{
  "siteName": "my-landing-page",
  "variables": {
    "SITE_TITLE": "My Awesome Product"
  }
}
```

#### POST `/v1/templates/:templateId/deploy`
Deploy template directly

**Request:**
```json
{
  "siteId": "existing-site",
  "adapter": "vercel",
  "profileId": "profile-id",
  "variables": {
    "SITE_TITLE": "My Product"
  }
}
```

---

### Adapter Builder

#### GET `/v1/adapter-builder`
List custom adapters

**Response:**
```json
[
  {
    "id": "adapter-id",
    "name": "my-platform",
    "displayName": "My Platform",
    "status": "draft",
    "version": "1.0.0"
  }
]
```

#### POST `/v1/adapter-builder`
Create new adapter

**Request:**
```json
{
  "name": "my-platform",
  "displayName": "My Platform",
  "description": "Deploy to my custom platform",
  "category": "platform"
}
```

#### GET `/v1/adapter-builder/:id`
Get adapter details

#### PATCH `/v1/adapter-builder/:id`
Update adapter code

**Request:**
```json
{
  "code": "// TypeScript adapter code",
  "config": {
    "requiredFields": ["apiKey"],
    "optionalFields": ["region"]
  }
}
```

#### POST `/v1/adapter-builder/:id/test`
Test adapter

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "test": "validateConfig",
      "passed": true,
      "message": "Config validation works"
    }
  ]
}
```

#### POST `/v1/adapter-builder/:id/publish`
Publish adapter

**Request:**
```json
{
  "version": "1.0.0",
  "changelog": "Initial release"
}
```

#### DELETE `/v1/adapter-builder/:id`
Delete adapter

---

### Audit

#### GET `/v1/sites/:siteId/audit`
Get audit log for site

**Query Parameters:**
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)
- `action`: Filter by action type
- `limit`: Max results (default 100)

**Response:**
```json
[
  {
    "id": "audit-id",
    "action": "deploy.activate",
    "userId": "user-id",
    "userEmail": "user@example.com",
    "metadata": {
      "deployId": "deploy-id",
      "adapter": "vercel"
    },
    "createdAt": "2025-10-21T00:00:00.000Z"
  }
]
```

---

### Tokens

#### POST `/v1/tokens`
Create API token

**Request:**
```json
{
  "name": "CI/CD Token",
  "expiresAt": "2026-10-21T00:00:00.000Z"
}
```

**Response:**
```json
{
  "id": "token-id",
  "token": "br_xxx",
  "name": "CI/CD Token",
  "createdAt": "2025-10-21T00:00:00.000Z"
}
```

#### GET `/v1/tokens`
List API tokens

#### DELETE `/v1/tokens/:tokenId`
Revoke API token

---

### Organizations

#### GET `/v1/orgs/:orgId`
Get organization details

#### GET `/v1/orgs/:orgId/members`
List organization members

#### POST `/v1/orgs/:orgId/members`
Add member to organization

#### DELETE `/v1/orgs/:orgId/members/:userId`
Remove member from organization

---

### Health

#### GET `/v1/health`
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T00:00:00.000Z",
  "services": {
    "database": "up",
    "storage": "up"
  }
}
```

---

## CLI Reference

The Brail CLI provides a complete command-line interface for deployments. Available as both `brail` and `br` commands.

### Installation

```bash
npm install -g @brailhq/cli
```

### Authentication

#### `brail login`
Login and save authentication token

```bash
brail login
# Prompts for email and password
```

Saves token to `~/.brail/config.json`

---

### Deployment Commands

#### `brail drop <dir>`
Deploy a directory

**Options:**
- `-s, --site <siteId>` - Site ID (required)
- `-y, --yes` - Auto-activate after upload
- `-p, --profile <name>` - Use connection profile
- `-a, --adapter <name>` - Adapter name
- `-t, --target <target>` - Target environment (`preview` | `production`)
- `--build [cmd]` - Build before deploy
- `--framework <framework>` - Framework type
- `--output <dir>` - Build output directory
- `--skip-build` - Skip auto-build

**Examples:**
```bash
# Basic deployment
br drop ./dist --site my-site

# With auto-activation
br drop ./dist --site my-site --yes

# Using profile
br drop ./dist --site my-site --profile production

# With build
br drop . --site my-site --build --framework next

# Production deployment
br drop ./dist --site my-site --target production
```

#### `br promote`
Promote preview deployment to production

**Options:**
- `-s, --site <siteId>` - Site ID (required)
- `--to <deployId>` - Deploy ID to promote (required)
- `-p, --profile <name>` - Connection profile
- `-y, --yes` - Skip confirmation

**Example:**
```bash
br promote --site my-site --to deploy-abc123 --yes
```

#### `br rollback`
Rollback to previous deployment

**Options:**
- `-s, --site <siteId>` - Site ID
- `-t, --to <deployId>` - Deploy ID to rollback to
- `-p, --profile <name>` - Connection profile
- `-a, --adapter <name>` - Adapter name

**Example:**
```bash
br rollback --site my-site --to deploy-xyz789
```

---

### Information Commands

#### `br status`
Show deployment status

**Options:**
- `-s, --site <siteId>` - Site ID
- `-d, --deploy <deployId>` - Deploy ID

**Example:**
```bash
br status --site my-site
```

#### `br releases`
List releases for a site

**Options:**
- `-s, --site <siteId>` - Site ID

**Example:**
```bash
br releases --site my-site
```

#### `br logs`
Show deployment logs

**Options:**
- `-s, --site <siteId>` - Site ID
- `-d, --deploy <deployId>` - Deploy ID
- `-f, --follow` - Follow live logs
- `-l, --limit <number>` - Number of logs

**Example:**
```bash
br logs --site my-site --deploy deploy-abc123 --follow
```

---

### Profile Management

#### `br profiles add`
Add a new connection profile

**Options:**
- `-s, --site <siteId>` - Site ID
- `-n, --name <name>` - Profile name
- `-a, --adapter <adapter>` - Adapter type

**Adapter-specific options:**

**SSH/Rsync:**
- `--host <host>` - SSH hostname
- `--port <port>` - SSH port
- `--user <user>` - SSH username
- `--privateKey <key>` - SSH private key (use `@file` to read from file)
- `--basePath <path>` - Base path on server
- `--keepReleases <n>` - Number of releases to keep

**S3:**
- `--bucket <bucket>` - S3 bucket name
- `--prefix <prefix>` - S3 prefix
- `--region <region>` - AWS region
- `--accessKeyId <key>` - AWS access key
- `--secretAccessKey <secret>` - AWS secret key
- `--endpoint <url>` - Custom S3 endpoint
- `--forcePathStyle` - Use path-style URLs

**Vercel:**
- `--token <token>` - Vercel API token
- `--teamId <id>` - Vercel team ID
- `--projectId <id>` - Vercel project ID
- `--productionDomain <domain>` - Production domain

**Example:**
```bash
# SSH profile
br profiles add \
  --site my-site \
  --name production \
  --adapter ssh-rsync \
  --host example.com \
  --port 22 \
  --user deploy \
  --privateKey @~/.ssh/id_rsa \
  --basePath /var/www/html

# Vercel profile
br profiles add \
  --site my-site \
  --name vercel-prod \
  --adapter vercel \
  --token @.vercel-token \
  --projectId prj_xxx
```

#### `br profiles list`
List connection profiles

**Options:**
- `-s, --site <siteId>` - Site ID

#### `br profiles default`
Set default profile

**Options:**
- `-s, --site <siteId>` - Site ID
- `-n, --name <name>` - Profile name

---

### Live Patching

#### `br replace <localFile>`
Replace a single file

**Options:**
- `-s, --site <siteId>` - Site ID
- `--dest <path>` - Destination path
- `-y, --yes` - Auto-activate

**Example:**
```bash
br replace ./app.css --site my-site --dest /css/app.css --yes
```

#### `br replace-dir <localDir>`
Replace a directory

**Options:**
- `-s, --site <siteId>` - Site ID
- `--dest <path>` - Destination directory
- `-y, --yes` - Auto-activate
- `--no-delete` - Don't delete removed files
- `--ignore <patterns>` - Glob patterns to ignore

**Example:**
```bash
br replace-dir ./images --site my-site --dest /assets/images --yes
```

#### `br delete-paths`
Delete specific paths

**Options:**
- `-s, --site <siteId>` - Site ID
- `--paths <paths>` - Comma-separated paths
- `-y, --yes` - Auto-activate

**Example:**
```bash
br delete-paths --site my-site --paths "/old/file.js,/deprecated/" --yes
```

#### `br watch`
Watch directory and auto-patch changes

**Options:**
- `-s, --site <siteId>` - Site ID (required)
- `--root <dir>` - Local directory to watch
- `--base <path>` - Base path for remote files
- `--ignore <patterns>` - Glob patterns to ignore
- `--auto` - Auto-activate patches

**Example:**
```bash
br watch --site my-site --root ./dist --base / --auto
```

---

### Domain Management

#### `br domain add <hostname>`
Add custom domain

**Options:**
- `-s, --site <siteId>` - Site ID

**Example:**
```bash
br domain add example.com --site my-site
```

#### `br domain list`
List domains

**Options:**
- `-s, --site <siteId>` - Site ID

#### `br domain verify <hostname>`
Verify domain DNS

**Options:**
- `-s, --site <siteId>` - Site ID

#### `br domain rm <hostname>`
Remove domain

**Options:**
- `-s, --site <siteId>` - Site ID

---

### Environment Variables

#### `br env list`
List environment variables

**Options:**
- `-s, --site <siteId>` - Site ID

#### `br env add`
Add environment variable

**Options:**
- `-s, --site <siteId>` - Site ID
- `-k, --key <key>` - Variable key
- `-v, --value <value>` - Variable value
- `-t, --target <target>` - Target environment

**Example:**
```bash
br env add --site my-site --key API_KEY --value secret123 --target production
```

#### `br env rm`
Remove environment variable

**Options:**
- `-s, --site <siteId>` - Site ID
- `-k, --key <key>` - Variable key

---

### Templates

#### `br templates list`
List available templates

**Example:**
```bash
br templates list
```

#### `br templates info <templateId>`
Show template details

**Example:**
```bash
br templates info landing-page
```

#### `br templates use <templateId>`
Use a template

**Options:**
- `--site <siteId>` - Existing site ID
- `--name <name>` - New site name
- `--adapter <adapter>` - Adapter to deploy with
- `--profile <profile>` - Profile to use
- `--var <key=value>` - Set template variables (repeatable)

**Examples:**
```bash
# Create new site from template
br templates use landing-page --name "My Landing Page"

# Deploy to existing site
br templates use landing-page --site my-site --profile production

# With variables
br templates use landing-page \
  --name "Product Launch" \
  --var SITE_TITLE="Amazing Product" \
  --var SITE_DESCRIPTION="Best product ever"
```

---

### Utility Commands

#### `br init`
Initialize `_drop.json` configuration

**Example:**
```bash
br init
# Creates _drop.json in current directory
```

#### `br adapters`
List available adapters

#### `br config`
Manage CLI configuration

**Options:**
- `-s, --site <siteId>` - Set default site
- `-a, --adapter <adapter>` - Set default adapter
- `-t, --target <target>` - Set default target
- `-l, --list` - List current config
- `--unset <key>` - Unset a value

**Example:**
```bash
# Set defaults
br config --site my-site --adapter vercel --target production

# View config
br config --list

# Unset default
br config --unset site
```

#### `br build [dir]`
Build a project locally

**Options:**
- `--framework <framework>` - Framework type
- `--cmd <command>` - Custom build command
- `--output <dir>` - Output directory
- `--skip-install` - Skip dependency installation

**Example:**
```bash
br build . --framework next
```

#### `br audit`
View site audit history

**Options:**
- `-s, --site <siteId>` - Site ID
- `--from <date>` - Start date
- `--to <date>` - End date
- `--action <action>` - Filter by action
- `--json` - Output as JSON
- `-l, --limit <number>` - Max results

**Example:**
```bash
br audit --site my-site --from 2025-10-01 --action deploy.activate
```

#### `br open`
Open deployment URL in browser

**Options:**
- `-s, --site <siteId>` - Site ID
- `-d, --deploy <deployId>` - Deploy ID

---

## SDK Reference

The Brail SDK (`@brailhq/sdk`) enables programmatic deployments via JavaScript/TypeScript.

### Installation

```bash
npm install @brailhq/sdk
```

### Quick Start

```typescript
import { Brail } from '@brailhq/sdk';

const brail = new Brail({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000' // optional
});

// Deploy
const result = await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: { token: 'xxx' },
  autoActivate: true
});

console.log(`Deployed: ${result.url}`);
```

### API Methods

#### Authentication

##### `login(email, password)`
Login and get API token

```typescript
const { token } = await brail.login('user@example.com', 'password123');
```

---

#### Sites

##### `createSite(name)`
Create a new site

```typescript
const site = await brail.createSite('my-site');
```

##### `getSite(siteId)`
Get site details

```typescript
const site = await brail.getSite('my-site');
```

##### `listSites()`
List all sites

```typescript
const sites = await brail.listSites();
```

##### `deleteSite(siteId)`
Delete a site

```typescript
await brail.deleteSite('my-site');
```

---

#### Deployments

##### `deploy(options)`
Deploy files to a site

**Options:**
```typescript
interface DeployOptions {
  siteId: string;
  path: string;              // Local directory or file
  adapter?: string;          // Adapter name
  config?: object;           // Adapter config
  profileId?: string;        // Profile ID
  target?: 'preview' | 'production';
  autoActivate?: boolean;    // Auto-activate (default: true)
  comment?: string;          // Deploy comment
  onProgress?: (progress) => void; // Progress callback
}
```

**Example:**
```typescript
const result = await brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: {
    token: process.env.VERCEL_TOKEN,
    projectId: 'prj_xxx'
  },
  target: 'production',
  autoActivate: true,
  comment: 'Deploy from CI'
});

console.log(result);
// {
//   deployId: 'deploy-abc123',
//   releaseId: 'release-xyz',
//   url: 'https://my-site.vercel.app',
//   status: 'active'
// }
```

##### `getDeployment(deployId)`
Get deployment details

```typescript
const deploy = await brail.getDeployment('deploy-abc123');
```

##### `listDeployments(siteId)`
List deployments for a site

```typescript
const deploys = await brail.listDeployments('my-site');
```

---

#### Releases

##### `promote(options)`
Promote preview to production

```typescript
await brail.promote({
  siteId: 'my-site',
  deployId: 'deploy-abc123',
  adapter: 'vercel',
  profileId: 'profile-id'
});
```

##### `rollback(options)`
Rollback to previous deployment

```typescript
await brail.rollback({
  siteId: 'my-site',
  toDeployId: 'deploy-xyz789',
  adapter: 'vercel'
});
```

---

#### Sandboxes

##### `createSandbox(options)`
Create a sandbox environment

**Options:**
```typescript
interface CreateSandboxOptions {
  provider: 'vercel-sandbox' | 'cloudflare-sandbox';
  path: string;           // Code directory
  config: {
    // Vercel options
    token?: string;
    runtime?: 'node22' | 'python3.13';
    vcpus?: number;
    // Cloudflare options
    accountId?: string;
    apiToken?: string;
    sandboxBinding?: string;
    // Common options
    buildCommand?: string;
    startCommand?: string;
  };
  siteName?: string;      // Optional site name
}
```

**Example (Vercel Sandbox):**
```typescript
const sandbox = await brail.createSandbox({
  provider: 'vercel-sandbox',
  path: './api',
  config: {
    token: process.env.VERCEL_TOKEN,
    runtime: 'node22',
    vcpus: 2,
    startCommand: 'npm start'
  }
});

console.log(`Sandbox URL: ${sandbox.url}`);
```

**Example (Cloudflare Sandbox):**
```typescript
const sandbox = await brail.createSandbox({
  provider: 'cloudflare-sandbox',
  path: './worker',
  config: {
    accountId: 'account-id',
    apiToken: process.env.CF_TOKEN,
    sandboxBinding: 'MY_SANDBOX'
  }
});
```

---

#### Templates

##### `deployTemplate(options)`
Deploy from a template

**Options:**
```typescript
interface TemplateOptions {
  template: string;       // Template ID
  siteName?: string;      // New site name
  siteId?: string;        // Existing site
  adapter?: string;       // Adapter name
  profileId?: string;     // Profile ID
  variables?: object;     // Template variables
}
```

**Example:**
```typescript
await brail.deployTemplate({
  template: 'landing-page',
  siteName: 'my-landing-page',
  adapter: 'vercel',
  variables: {
    SITE_TITLE: 'My Product',
    SITE_DESCRIPTION: 'Best product ever'
  }
});
```

---

#### Profiles

##### `createProfile(options)`
Create connection profile

```typescript
await brail.createProfile({
  siteId: 'my-site',
  name: 'production',
  adapter: 'ssh-rsync',
  config: {
    host: 'example.com',
    user: 'deploy',
    privateKey: await fs.readFile('~/.ssh/id_rsa', 'utf8')
  }
});
```

##### `listProfiles(siteId)`
List profiles for a site

```typescript
const profiles = await brail.listProfiles('my-site');
```

---

### CI/CD Examples

#### GitHub Actions

```yaml
name: Deploy to Brail
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to Brail
        run: |
          npm install -g @brailhq/sdk
          node deploy.js
        env:
          BRAIL_API_KEY: ${{ secrets.BRAIL_API_KEY }}
```

**deploy.js:**
```javascript
const { Brail } = require('@brailhq/sdk');

const brail = new Brail({ apiKey: process.env.BRAIL_API_KEY });

brail.deploy({
  siteId: 'my-site',
  path: './dist',
  adapter: 'vercel',
  config: {
    token: process.env.VERCEL_TOKEN
  },
  activate: true,
  comment: `Deploy ${process.env.GITHUB_SHA.substring(0, 7)}`
}).then(result => {
  console.log(`Deployed: ${result.url}`);
}).catch(err => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
```

---

## Web Dashboard

The web dashboard provides a visual interface for managing deployments.

### Pages

#### `/` - Dashboard Home
- Recent deployments
- Quick actions
- System status

#### `/sites` - Sites List
- All sites with deployment counts
- Create new site
- Quick links to templates and adapters

#### `/sites/:id` - Site Details
**Tabs:**
- **Overview**: Latest deployment, domains, quick stats
- **Activity**: Deployment history and audit log
- **Destinations**: Connection profiles management
- **Domains**: Custom domain management
- **Environment**: Environment variables
- **Files**: File browser for active deployment

#### `/templates` - Templates Gallery
- Browse available templates
- Filter by category
- Preview and deploy templates

#### `/adapter-builder` - Visual Adapter Builder
**Tabs:**
- **My Adapters**: Custom adapters you've built
- **Create New**: Wizard for building adapters
- **Templates**: Pre-built adapter templates

#### `/adapter-builder/:id` - Adapter Editor
**Tabs:**
- **Code**: TypeScript adapter implementation
- **Config**: Required/optional fields
- **Test**: Run adapter tests
- **Docs**: Adapter SDK documentation

#### `/adapters` - Adapter Catalog
- Browse all available adapters
- Grouped by category
- View adapter features and docs

#### `/settings/team` - Team Management
- Organization members
- Invitations
- Access control

#### `/login` - Authentication
- Email/password login
- Remember me option

---

### Components

#### `DashboardHeader`
Top navigation with user menu

#### `StatusBadge`
Color-coded deployment status

#### `DeployUploader`
Drag-and-drop file upload

#### `LogViewer`
Real-time deployment logs

#### `VirtualList`
Efficient rendering of large lists

#### `ConfirmModal`
Confirmation dialogs

#### `FilePreviewModal`
Preview files before deployment

---

## Adapters

Brail supports 13 deployment adapters across different categories.

### Traditional & Self-Hosted

#### SSH/Rsync (`ssh-rsync`)
Deploy to any server via SSH with rsync

**Features:**
- Zero-downtime deployments
- Atomic symlink switching
- Health checks
- Rollback support
- Release management

**Configuration:**
```json
{
  "host": "example.com",
  "port": 22,
  "user": "deploy",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
  "basePath": "/var/www/html",
  "keepReleases": 5,
  "health": {
    "mode": "url",
    "url": "https://example.com/health",
    "timeoutMs": 5000,
    "retries": 3
  }
}
```

#### FTP (`ftp`)
Deploy via FTP/FTPS

**Features:**
- FTP and FTPS support
- Directory sync
- Passive mode

**Configuration:**
```json
{
  "host": "ftp.example.com",
  "port": 21,
  "user": "ftpuser",
  "password": "secret",
  "basePath": "/public_html",
  "secure": true
}
```

---

### Storage & CDN

#### S3 (`s3`)
Deploy to AWS S3 or S3-compatible storage

**Features:**
- CloudFront invalidation
- Custom metadata
- Public/private buckets
- Path-style or virtual-hosted URLs

**Configuration:**
```json
{
  "bucket": "my-bucket",
  "region": "us-east-1",
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "prefix": "site/",
  "endpoint": "https://s3.us-east-1.amazonaws.com",
  "forcePathStyle": false
}
```

---

### Managed Platforms

#### Vercel (`vercel`)
Deploy to Vercel

**Features:**
- Preview and production deployments
- Automatic domains
- Zero-config frameworks
- Edge network

**Configuration:**
```json
{
  "token": "vercel_token_xxx",
  "teamId": "team_xxx",
  "projectId": "prj_xxx",
  "framework": "nextjs",
  "productionDomain": "example.com"
}
```

#### Cloudflare Pages (`cloudflare-pages`)
Deploy to Cloudflare Pages

**Features:**
- Global CDN
- Preview branches
- Custom domains
- Instant deploys

**Configuration:**
```json
{
  "accountId": "account-id",
  "apiToken": "cloudflare-token",
  "projectName": "my-project",
  "productionDomain": "example.com"
}
```

#### Netlify (`netlify`)
Deploy to Netlify

**Features:**
- Edge network
- Atomic deployments
- Instant rollbacks
- Branch deploys

**Configuration:**
```json
{
  "token": "netlify-token",
  "siteId": "site-id"
}
```

#### Railway (`railway`)
Deploy to Railway

**Features:**
- Full-stack deployments
- Automatic SSL
- Custom domains
- Environment management

**Configuration:**
```json
{
  "token": "railway-token",
  "projectId": "project-id",
  "environmentId": "env-id",
  "serviceName": "my-service"
}
```

#### Fly.io (`fly`)
Deploy to Fly.io

**Features:**
- Global edge deployment
- Multi-region
- Automatic SSL
- Zero-downtime deploys

**Configuration:**
```json
{
  "accessToken": "fly-token",
  "appName": "my-app",
  "org": "my-org"
}
```

#### Render (`render`)
Deploy to Render

**Features:**
- Static sites
- Free SSL
- Global CDN
- Instant deploys

**Configuration:**
```json
{
  "apiKey": "render-key",
  "serviceId": "srv_xxx"
}
```

#### GitHub Pages (`github-pages`)
Deploy to GitHub Pages

**Features:**
- Free hosting
- Custom domains
- HTTPS by default
- Jekyll support

**Configuration:**
```json
{
  "token": "github-token",
  "owner": "username",
  "repo": "repo-name",
  "branch": "gh-pages"
}
```

---

### Serverless & Edge

#### Cloudflare Workers (`cloudflare-workers`)
Deploy serverless functions to Cloudflare Workers

**Features:**
- Edge computing
- Sub-millisecond response
- KV storage
- Durable Objects

**Configuration:**
```json
{
  "accountId": "account-id",
  "apiToken": "cf-token",
  "scriptName": "my-worker"
}
```

---

### Sandboxes

#### Vercel Sandbox (`vercel-sandbox`)
Dynamic Node.js/Python applications on Vercel

**Features:**
- Serverless functions
- Node.js 18/20/22
- Python 3.9/3.11
- Environment variables
- Instant scaling

**Configuration:**
```json
{
  "token": "vercel-token",
  "runtime": "node22",
  "env": {
    "DATABASE_URL": "postgres://..."
  }
}
```

#### Cloudflare Sandbox (`cloudflare-sandbox`)
Isolated code execution on Cloudflare

**Features:**
- Worker-based sandboxes
- Sub-millisecond cold starts
- Global edge execution
- Secure isolation

**Configuration:**
```json
{
  "accountId": "account-id",
  "apiToken": "cf-token",
  "scriptName": "sandbox-worker"
}
```

---

### Building Custom Adapters

#### Using Adapter Kit

Install the adapter kit:
```bash
npm install @brailhq/adapter-kit
```

**Example adapter:**
```typescript
import { defineAdapter, validateRequired } from '@brailhq/adapter-kit';

export default defineAdapter({
  name: 'my-platform',
  title: 'My Platform',
  description: 'Deploy to my custom platform',
  category: 'platform',
  
  validateConfig(config) {
    validateRequired(config, ['apiKey', 'projectId']);
  },
  
  async upload(ctx, input) {
    const { files, config } = input;
    
    // Upload files to your platform
    const uploadId = await uploadFiles(files, config);
    
    return {
      externalId: uploadId,
      previewUrl: `https://preview.myplatform.com/${uploadId}`
    };
  },
  
  async activate(ctx, input) {
    const { externalId, config } = input;
    
    // Activate the deployment
    await activateDeployment(externalId, config);
    
    return {
      url: `https://myplatform.com/${config.projectId}`,
      externalId
    };
  },
  
  async rollback(ctx, input) {
    const { previousExternalId, config } = input;
    
    // Rollback logic
    await rollbackTo(previousExternalId, config);
    
    return { success: true };
  }
});
```

#### Using CLI Scaffolder

```bash
npm create br-adapter

# Prompts:
# Name: my-platform
# Display name: My Platform
# Category: platform
# Description: Deploy to my custom platform
```

Creates adapter boilerplate with:
- TypeScript setup
- Example implementation
- Test utilities
- README

#### Using Visual Builder

1. Go to `/adapter-builder` in dashboard
2. Click **Create New**
3. Fill in adapter details
4. Write code in browser editor
5. Test with one-click
6. Publish to catalog

---

## Templates

Pre-built, production-ready templates for instant deployment.

### Available Templates

#### Landing Page (`landing-page`)
Modern marketing landing page

**Tech Stack:**
- HTML5
- Tailwind CSS
- Alpine.js

**Variables:**
- `SITE_TITLE` - Site title
- `SITE_DESCRIPTION` - Meta description
- `CONTACT_EMAIL` - Contact email
- `PRIMARY_COLOR` - Brand color

**Deploy Time:** < 30 seconds

#### Portfolio (`portfolio`)
Clean portfolio for creatives

**Tech Stack:**
- HTML5
- CSS3
- Vanilla JavaScript

**Variables:**
- `NAME` - Your name
- `TITLE` - Job title
- `BIO` - Short bio
- `GITHUB_URL` - GitHub profile

**Deploy Time:** < 30 seconds

#### Coming Soon (`coming-soon`)
Minimal coming soon page

**Tech Stack:**
- HTML5
- Tailwind CSS

**Variables:**
- `PRODUCT_NAME` - Product name
- `LAUNCH_DATE` - Launch date
- `SIGNUP_URL` - Email signup URL

**Deploy Time:** < 20 seconds

---

### Using Templates

#### Via Web Dashboard

1. Navigate to **Templates**
2. Browse available templates
3. Click **Use Template**
4. Customize variables
5. Deploy

#### Via CLI

```bash
# List templates
br templates list

# Use template
br templates use landing-page \
  --name "Product Launch" \
  --var SITE_TITLE="Amazing Product"
```

#### Via SDK

```typescript
await brail.deployTemplate({
  template: 'landing-page',
  siteName: 'my-landing',
  variables: {
    SITE_TITLE: 'My Product',
    SITE_DESCRIPTION: 'Best product ever'
  }
});
```

---

## Deployment Workflow

### Standard Deployment

```
┌──────────────┐
│   Build      │ (optional, auto-detected)
└──────┬───────┘
       │
┌──────▼───────┐
│   Upload     │ Files → Brail API
└──────┬───────┘
       │
┌──────▼───────┐
│   Stage      │ Upload to adapter (preview)
└──────┬───────┘
       │
┌──────▼───────┐
│  Activate    │ Switch to production
└──────────────┘
```

### With Health Checks (SSH/Rsync)

```
┌──────────────┐
│   Upload     │ New release directory
└──────┬───────┘
       │
┌──────▼───────┐
│ Health Check │ Verify new deployment
└──────┬───────┘
       │
┌──────▼───────┐
│   Symlink    │ Atomic switch (zero downtime)
└──────┬───────┘
       │
┌──────▼───────┐
│   Cleanup    │ Remove old releases
└──────────────┘
```

### Rollback Flow

```
┌──────────────┐
│  Identify    │ Previous deployment ID
└──────┬───────┘
       │
┌──────▼───────┐
│ Call Adapter │ Rollback to previous
└──────┬───────┘
       │
┌──────▼───────┐
│  Activate    │ Previous deployment is live
└──────┬───────┘
       │
┌──────▼───────┐
│ Audit Log    │ Record rollback event
└──────────────┘
```

---

## Security & Authentication

### Authentication Methods

1. **JWT Cookies** (Web Dashboard)
   - HttpOnly cookies
   - Secure flag in production
   - 24-hour expiration

2. **Bearer Tokens** (API/CLI)
   - Long-lived tokens
   - Prefixed with `br_`
   - Revocable via API

3. **API Keys** (SDK)
   - Service accounts
   - Machine-to-machine auth
   - Scoped permissions

### Authorization

**Role-Based Access Control (RBAC):**
- **Owner**: Full access to organization
- **Admin**: Manage sites and members
- **Developer**: Deploy and manage sites
- **Viewer**: Read-only access

### Secrets Management

**Encrypted at Rest:**
- SSH private keys
- API tokens
- Database credentials
- Environment variables

**Encryption:**
- AES-256-GCM
- Unique key per secret
- Keys stored in environment

### Best Practices

1. **Use connection profiles** for credentials
2. **Rotate tokens** regularly
3. **Use environment variables** for sensitive data
4. **Enable audit logging** for compliance
5. **Limit token scope** to necessary permissions

---

## Database Schema

### Core Tables

#### `User`
- `id` - UUID
- `email` - Unique email
- `passwordHash` - Bcrypt hash
- `orgId` - Organization reference
- `createdAt`

#### `Organization`
- `id` - UUID
- `name` - Org name
- `createdAt`

#### `Site`
- `id` - String (user-defined)
- `name` - Display name
- `orgId` - Organization reference
- `ownerId` - User reference
- `createdAt`
- `deletedAt` - Soft delete

#### `Deploy`
- `id` - UUID
- `siteId` - Site reference
- `status` - Enum: pending, uploaded, active, inactive, failed
- `hash` - Content hash (SHA-256)
- `size` - Total size in bytes
- `fileCount` - Number of files
- `comment` - Deploy comment
- `deployedBy` - User reference
- `deployedByEmail` - User email
- `framework` - Detected framework
- `createdAt`
- `finalizedAt`

#### `Release`
- `id` - UUID
- `deployId` - Deploy reference
- `siteId` - Site reference
- `profileId` - Profile reference (optional)
- `adapter` - Adapter name
- `config` - JSON configuration
- `target` - Enum: preview, production
- `status` - Enum: pending, staged, active, failed
- `externalId` - Platform-specific ID
- `externalUrl` - Deployment URL
- `metadata` - JSON metadata
- `createdAt`
- `activatedAt`

#### `Profile`
- `id` - UUID
- `siteId` - Site reference
- `name` - Profile name
- `adapter` - Adapter name
- `config` - Encrypted JSON configuration
- `isDefault` - Boolean
- `createdAt`

#### `Patch`
- `id` - UUID
- `siteId` - Site reference
- `basedOnDeployId` - Base deployment
- `type` - Enum: replace, delete
- `paths` - JSON paths affected
- `status` - Enum: pending, active
- `createdAt`
- `activatedAt`

#### `Domain`
- `id` - UUID
- `siteId` - Site reference
- `hostname` - Domain name
- `verified` - Boolean
- `sslStatus` - Enum: pending, active, failed
- `sslCertificate` - Text
- `sslPrivateKey` - Encrypted text
- `dnsRecords` - JSON
- `createdAt`
- `verifiedAt`

#### `EnvVariable`
- `id` - UUID
- `siteId` - Site reference
- `key` - Variable key
- `value` - Encrypted value
- `target` - Enum: preview, production, all
- `createdAt`

#### `Token`
- `id` - UUID
- `userId` - User reference
- `token` - Hashed token
- `name` - Token name
- `createdAt`
- `expiresAt`
- `lastUsedAt`

#### `AuditLog`
- `id` - UUID
- `orgId` - Organization reference
- `siteId` - Site reference (optional)
- `userId` - User reference
- `userEmail` - User email
- `action` - Action type
- `metadata` - JSON metadata
- `createdAt`

---

## Configuration

### Environment Variables

#### Required

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/brail"

# JWT Secret
JWT_SECRET="your-secret-key-at-least-32-chars"

# Storage
STORAGE_PATH="/var/brail/storage"
```

#### Optional

```bash
# API
PORT=3000
API_URL="http://localhost:3000"

# Web Dashboard
WEB_URL="http://localhost:3001"

# External Adapter Catalog
ADAPTER_CATALOG_URL="https://adapters.brail.io/catalog.json"

# Email (for notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="user"
SMTP_PASS="pass"
SMTP_FROM="noreply@brail.io"

# Let's Encrypt (for SSL)
ACME_EMAIL="admin@example.com"
ACME_DIRECTORY="https://acme-v02.api.letsencrypt.org/directory"

# Logging
LOG_LEVEL="info"
```

### Configuration Files

#### `_drop.json`
Per-project configuration for CLI deployments

```json
{
  "siteId": "my-site",
  "adapter": "vercel",
  "profile": "production",
  "target": "production",
  "build": {
    "enabled": true,
    "framework": "next",
    "output": "dist"
  },
  "ignore": [
    "node_modules",
    ".git",
    "*.md"
  ]
}
```

#### `~/.brail/config.json`
CLI global configuration

```json
{
  "apiUrl": "http://localhost:3000",
  "token": "br_xxx",
  "defaults": {
    "site": "my-site",
    "adapter": "vercel",
    "target": "production"
  }
}
```

---

## Development Guide

### Setup

```bash
# Install dependencies
pnpm install

# Setup database
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev

# Start development servers
pnpm dev
```

This starts:
- API: `http://localhost:3000`
- Web: `http://localhost:3001`

### Project Structure

```
brail/
├── apps/
│   ├── api/          # NestJS backend
│   ├── cli/          # Commander CLI
│   └── web/          # Nuxt frontend
├── packages/
│   ├── adapter-kit/  # Adapter SDK
│   ├── adapters/     # Adapter implementations
│   ├── sdk/          # Programmatic SDK
│   ├── frameworks/   # Framework detection
│   ├── shared/       # Shared utilities
│   └── domain-utils/ # DNS utilities
├── templates/        # Pre-built templates
├── tests/           # Test suites
└── docs/            # Documentation
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/adapters
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test adapters
```

### Database Migrations

```bash
cd apps/api

# Create migration
pnpm prisma migrate dev --name add_feature

# Apply migrations
pnpm prisma migrate deploy

# Reset database
pnpm prisma migrate reset
```

### Adding a New Adapter

1. Create adapter file in `packages/adapters/src/`
2. Implement `DeployAdapter` interface
3. Register in `packages/adapters/src/index.ts`
4. Add to `apps/api/src/adapters/adapter.registry.ts`
5. Add catalog entry in `apps/api/src/catalog/adapter-catalog.service.ts`
6. Write tests
7. Update documentation

---

## API Versioning

Current version: **v1**

Base path: `/v1`

Breaking changes will introduce new versions (v2, v3, etc.) with migration guides.

---

## Rate Limiting

- **Authenticated requests**: 1000 req/hour
- **Unauthenticated requests**: 100 req/hour
- **File uploads**: 100 MB/request
- **Total storage**: 10 GB per organization

---

## Support & Resources

- **Documentation**: https://docs.brail.io
- **GitHub**: https://github.com/brailhq/brail
- **Discord**: https://discord.gg/brail
- **Email**: support@brail.io

---

## License

MIT License - See [LICENSE](./LICENSE)

---

**Built with ❤️ by the Brail team**

