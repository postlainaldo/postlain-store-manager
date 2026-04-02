# syntax=docker/dockerfile:1
# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Use Debian slim for build stages — avoids Alpine gcc I/O errors
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
# Cache npm downloads on VPS SSD — only re-runs when package.json changes
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Cache Next.js build artifacts on VPS SSD — incremental compile on code changes
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
# Use Alpine for the final image to keep it small
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public       ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static  ./.next/static

# Copy native modules (better-sqlite3 .node binary built on Debian)
# Note: binaries built on Debian work on Alpine via gcompat (libc6-compat)
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings       ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Persistent data directory (mount a volume here in Coolify)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
