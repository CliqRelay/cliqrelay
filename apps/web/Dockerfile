# ---------- Base ----------
FROM node:lts-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN corepack enable & corepack prepare pnpm@11.9.0 --activate

# ---------- Prune (Turborepo) ----------
FROM base AS pruner

COPY . .

RUN pnpm dlx turbo prune web --docker

# ---------- Dependencies ----------
FROM base AS deps

WORKDIR /app

COPY --from=pruner /app/out/json/ .

RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS builder

WORKDIR /app

COPY --from=pruner /app/out/full/ .
COPY --from=deps /app/node_modules ./node_modules

ARG VITE_EXTENSION_ID
ARG VITE_AUTHULA_URL
ARG VITE_API_URL
ARG VITE_BASE_URL
ARG VITE_APP_NAME

# "loose" env mode enables turbo to pass through ARGs & ENVs to the underlying command or else they are blocked by default. 
RUN pnpm dlx turbo run build --filter=web... --env-mode loose

# ---------- Runtime ----------
FROM node:lts-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Optional: run as non-root (recommended)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Copy only necessary files
COPY --from=builder --chown=nodejs:nodejs /app .

EXPOSE 3000

CMD ["node", "apps/web/.output/server/index.mjs"]
