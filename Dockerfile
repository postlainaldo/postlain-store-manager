# syntax=docker/dockerfile:1.4
# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY package files first — Docker image layer cache will skip npm ci
# if package.json + package-lock.json haven't changed
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

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

# Required by Next.js standalone at runtime
COPY --from=builder /app/node_modules/@swc               ./node_modules/@swc

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# stores.json — config danh sách cửa hàng (không phải DB, cần có trong image)
COPY --from=builder /app/data/stores.json ./data/stores.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
