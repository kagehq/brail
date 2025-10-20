# Brail Production Dockerfile
# Build version: 2025-10-20-v7
FROM node:22-slim

# Install build dependencies for native modules and Prisma requirements
# Debian-slim has better compatibility with Prisma's precompiled binaries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/domain-utils/package.json ./packages/domain-utils/
COPY packages/frameworks/package.json ./packages/frameworks/
COPY packages/adapter-kit/package.json ./packages/adapter-kit/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/cli/package.json ./apps/cli/

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source files
COPY . .

# Build workspace dependencies
RUN pnpm --filter @br/shared build
RUN pnpm --filter @br/adapters build
RUN pnpm --filter @br/domain-utils build
RUN pnpm --filter @br/frameworks build

# Build applications
RUN pnpm --filter @br/api build
RUN pnpm --filter @br/web build

# Expose default port
EXPOSE 3000

# Start command
CMD ["pnpm", "start"]
