# Database Setup Guide

Complete guide for setting up and managing the Brail PostgreSQL database.

## Quick Start

### 1. Create Database

```bash
# Using psql
psql -U postgres
```

```sql
CREATE DATABASE brail;
\q
```

### 2. Run Setup Script

```bash
# Option 1: Using psql directly
psql -U postgres -d brail -f scripts/setup-database.sql

# Option 2: Using DATABASE_URL environment variable
psql $DATABASE_URL -f scripts/setup-database.sql

# Option 3: Using the connection string
psql "postgresql://postgres:postgres@localhost:5432/brail" -f scripts/setup-database.sql
```

### 3. Generate Encryption Keys

```bash
node scripts/generate-key.js
```

Add the generated key to `apps/api/.env`:

```env
SECRET_KEY_256=your-generated-64-char-hex-key
```

### 4. Verify Setup

```bash
# Check tables were created
psql $DATABASE_URL -c "\dt"

# Count tables (should be 15+)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## Using Prisma (Recommended)

If you prefer using Prisma for migrations:

```bash
cd apps/api

# Generate Prisma Client
pnpm prisma generate

# Run all migrations
pnpm prisma migrate deploy

# Or for development
pnpm prisma migrate dev
```

## Database Schema Overview

### Core Tables

- **User** - User accounts
- **Org** - Organizations (teams)
- **OrgMember** - Organization memberships
- **OrgInvite** - Pending invitations

### Deployment Tables

- **Site** - Projects/applications
- **Deploy** - File uploads and builds
- **Patch** - Incremental updates
- **Release** - Platform-specific deployments

### Configuration

- **ConnectionProfile** - Saved adapter configs
- **Token** - API tokens
- **EnvVar** - Environment variables (encrypted)

### Domains & SSL

- **Domain** - Custom domains
- **SslCertificate** - SSL/TLS certificates

### Logging & Monitoring

- **BuildLog** - Build output and logs
- **DeploymentLog** - Real-time deployment logs
- **AuditEvent** - Security and compliance logs

## Common Tasks

### Reset Database

```bash
# ⚠️ WARNING: This will delete all data!
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL -f scripts/setup-database.sql
```

### Backup Database

```bash
# Full backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema-$(date +%Y%m%d).sql

# Data only
pg_dump --data-only $DATABASE_URL > data-$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
psql $DATABASE_URL < backup-20251021.sql
```

### Connect to Database

```bash
# Interactive session
psql $DATABASE_URL

# Run single query
psql $DATABASE_URL -c "SELECT * FROM \"User\" LIMIT 10;"

# Export query results to CSV
psql $DATABASE_URL -c "COPY (SELECT * FROM \"Site\") TO STDOUT WITH CSV HEADER" > sites.csv
```

## Production Setup (Supabase)

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create new project
3. Copy the connection string

### 2. Configure Environment

Update `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

### 3. Run Migrations

```bash
cd apps/api
pnpm prisma migrate deploy
```

## Troubleshooting

### Error: "relation already exists"

The table already exists. Safe to ignore, or drop the table:

```sql
DROP TABLE "TableName" CASCADE;
```

### Error: "permission denied"

Grant necessary permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE brail TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

### Error: "could not connect to server"

Check PostgreSQL is running:

```bash
# macOS (via Homebrew)
brew services start postgresql@14

# Linux (systemd)
sudo systemctl start postgresql

# Docker
docker-compose up -d postgres
```

### Slow Queries

Check missing indexes:

```sql
-- Find tables without indexes
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
    SELECT tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public'
);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Deploy" WHERE "siteId" = 'xxx';
```

## Maintenance

### Vacuum Database

```bash
# Analyze and optimize
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Full vacuum (requires downtime)
psql $DATABASE_URL -c "VACUUM FULL;"
```

### Check Database Size

```sql
SELECT 
    pg_size_pretty(pg_database_size('brail')) as database_size;

SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Active Connections

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'brail';
```

## Security Checklist

- [ ] Database passwords are strong (32+ characters)
- [ ] `SECRET_KEY_256` is generated securely
- [ ] SSL/TLS enabled for production connections
- [ ] Database backups automated (daily minimum)
- [ ] Access restricted by IP allowlist
- [ ] Least-privilege user accounts created
- [ ] Audit logs reviewed regularly

## Additional Resources

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)

## Support

For issues or questions:
- **Discord**: [Join our community](https://discord.gg/KqdBcqRk5E)
- **GitHub**: [Open an issue](https://github.com/kagehq/brail/issues)

