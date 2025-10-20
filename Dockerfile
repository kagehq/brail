# Use Node.js 22 Alpine
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/domain-utils/package.json ./packages/domain-utils/
COPY packages/frameworks/package.json ./packages/frameworks/
COPY packages/adapter-kit/package.json ./packages/adapter-kit/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/cli/package.json ./apps/cli/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build workspace packages
RUN pnpm --filter @br/shared build && \
    pnpm --filter @br/adapters build && \
    pnpm --filter @br/domain-utils build && \
    pnpm --filter @br/frameworks build

# Expose port
EXPOSE 3000

# Default command (can be overridden per service)
CMD ["pnpm", "start"]

