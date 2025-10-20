#!/bin/bash

# Development script to run all services concurrently
# Requires: docker, docker-compose, pnpm

set -e

echo "🚀 Starting Brail Development Environment"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start infrastructure
echo "📦 Starting infrastructure (Postgres + MinIO)..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check if database needs migration
echo "🗄️  Checking database..."
if ! cd apps/api && pnpm prisma db push --skip-generate > /dev/null 2>&1; then
  echo "🔧 Running database migrations..."
  pnpm prisma migrate dev --name init
fi

cd ../..

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd apps/api && pnpm prisma generate
cd ../..

echo ""
echo "✅ Infrastructure ready!"
echo ""
echo "📝 Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - MinIO: localhost:9000"
echo "  - MinIO Console: http://localhost:9001"
echo ""
echo "🚀 Starting development servers..."
echo ""

# Run dev servers with turbo
pnpm dev

