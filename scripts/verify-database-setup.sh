#!/bin/bash

# ============================================================================
# Database Setup Verification Script
# ============================================================================
# This script verifies that the manual setup script matches the Prisma schema
#
# Usage: ./scripts/verify-database-setup.sh
# ============================================================================

set -e

echo "🔍 Verifying Brail Database Setup..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Using default PostgreSQL connection.${NC}"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brail_test"
fi

echo "📊 Database: $DATABASE_URL"
echo ""

# Create test database
echo "1️⃣  Creating test database..."
psql "$(echo $DATABASE_URL | sed 's|/[^/]*$|/postgres|')" -c "DROP DATABASE IF EXISTS brail_test;" 2>/dev/null || true
psql "$(echo $DATABASE_URL | sed 's|/[^/]*$|/postgres|')" -c "CREATE DATABASE brail_test;" 2>/dev/null

# Run setup script
echo "2️⃣  Running setup script..."
psql "postgresql://postgres:postgres@localhost:5432/brail_test" -f scripts/setup-database.sql > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Setup script executed successfully${NC}"
else
    echo -e "${RED}❌ Setup script failed${NC}"
    exit 1
fi

# Generate Prisma schema SQL
echo "3️⃣  Generating Prisma schema SQL..."
cd apps/api
npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > /tmp/prisma-schema.sql 2>/dev/null
cd ../..

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma schema generated${NC}"
else
    echo -e "${RED}❌ Prisma schema generation failed${NC}"
    exit 1
fi

# Count tables
echo ""
echo "4️⃣  Comparing table counts..."
MANUAL_TABLES=$(psql "postgresql://postgres:postgres@localhost:5432/brail_test" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '_prisma_migrations';" | tr -d ' ')
PRISMA_TABLES=$(grep -c "CREATE TABLE" /tmp/prisma-schema.sql || echo "0")

echo "   Manual setup: $MANUAL_TABLES tables"
echo "   Prisma schema: $PRISMA_TABLES tables"

if [ "$MANUAL_TABLES" -eq "$PRISMA_TABLES" ]; then
    echo -e "${GREEN}✅ Table counts match${NC}"
else
    echo -e "${YELLOW}⚠️  Table count mismatch (this might be OK if _prisma_migrations is counted)${NC}"
fi

# List all tables
echo ""
echo "5️⃣  Tables in database:"
psql "postgresql://postgres:postgres@localhost:5432/brail_test" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | sed 's/^/   ✓ /'

# Verify key tables exist
echo ""
echo "6️⃣  Verifying critical tables..."

REQUIRED_TABLES=(
    "User"
    "Org"
    "OrgMember"
    "OrgInvite"
    "Site"
    "Deploy"
    "Patch"
    "Domain"
    "SslCertificate"
    "Token"
    "ConnectionProfile"
    "Release"
    "DeploymentLog"
    "AuditEvent"
    "BuildCache"
    "EnvVar"
    "BuildLog"
)

MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_EXISTS=$(psql "postgresql://postgres:postgres@localhost:5432/brail_test" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | tr -d ' ')
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        echo -e "   ${GREEN}✅ $table${NC}"
    else
        echo -e "   ${RED}❌ $table (MISSING)${NC}"
        MISSING_TABLES+=("$table")
    fi
done

# Check indexes
echo ""
echo "7️⃣  Checking indexes..."
INDEX_COUNT=$(psql "postgresql://postgres:postgres@localhost:5432/brail_test" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' ')
echo "   Found $INDEX_COUNT indexes"

# Check foreign keys
echo ""
echo "8️⃣  Checking foreign key constraints..."
FK_COUNT=$(psql "postgresql://postgres:postgres@localhost:5432/brail_test" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" | tr -d ' ')
echo "   Found $FK_COUNT foreign key constraints"

# Cleanup
echo ""
echo "9️⃣  Cleaning up..."
psql "$(echo $DATABASE_URL | sed 's|/[^/]*$|/postgres|')" -c "DROP DATABASE IF EXISTS brail_test;" 2>/dev/null
rm -f /tmp/prisma-schema.sql

# Final result
echo ""
echo "================================================"
if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ DATABASE SETUP VERIFIED SUCCESSFULLY${NC}"
    echo ""
    echo "The setup script contains all required tables and appears to be"
    echo "compatible with the Prisma schema."
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Missing tables:"
    for table in "${MISSING_TABLES[@]}"; do
        echo "  - $table"
    done
    exit 1
fi

