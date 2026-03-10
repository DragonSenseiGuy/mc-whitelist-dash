FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

EXPOSE 4010

ENV PORT=4010
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "chown nextjs:nodejs /app/data && cp /etc/mc-dashboard/id_ed25519 /tmp/id_ed25519 && chown nextjs:nodejs /tmp/id_ed25519 && chmod 600 /tmp/id_ed25519 && export MC_SSH_KEY_PATH=/tmp/id_ed25519 && su -s /bin/sh nextjs -c 'MC_SSH_KEY_PATH=/tmp/id_ed25519 node server.js'"]
