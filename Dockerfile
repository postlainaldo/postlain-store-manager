# syntax=docker/dockerfile:1.4
# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Cache npm on VPS SSD — only re-runs when package.json changes
RUN --mount=type=cache,id=postlain-npm,target=/root/.npm \
    npm ci --prefer-offline

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cache Next.js incremental build on VPS SSD — only recompiles changed files
RUN --mount=type=cache,id=postlain-nextjs,target=/app/.next/cache \
    npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public           ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static

# Native modules
COPY --from=builder /app/node_modules/better-sqlite3      ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings            ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path    ./node_modules/file-uri-to-path

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
