# syntax=docker/dockerfile:1
# Multi-Stage-Build: schlankes Runtime-Image ohne Build-Werkzeug.

# ---------------------------------------------------------------- deps ------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
# Der Build braucht nur eine syntaktisch gueltige URL; verbunden wird nicht.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate && npm run build

# --------------------------------------------------------------- runner -----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Vienna \
    UPLOAD_DIR=/data/uploads

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Schema und generierter Client fuer die Laufzeit.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
COPY --chown=nextjs:nodejs docker/seed.mjs ./docker/seed.mjs
RUN chmod +x ./entrypoint.sh && mkdir -p /data/uploads && chown -R nextjs:nodejs /data

# Prisma-CLI fuer `migrate deploy` beim Start – bewusst frisch installiert statt
# aus dem Builder kopiert. Die CLI haengt an einer eigenen Kette (@prisma/config
# -> effect, @prisma/engines mit dem Schema-Engine-Binary), und `node_modules/
# .bin/prisma` ist ein Symlink, den COPY zu einer echten Datei macht – die CLI
# sucht ihre WASM-Dateien dann neben sich im falschen Verzeichnis. Beides faellt
# sonst erst beim ersten Containerstart auf, in einer Restart-Schleife.
# Die Version kommt aus der package.json, damit es nur eine Wahrheit gibt, und
# der Rauchtest am Ende beweist im fertigen Image, dass sie startet.
RUN PRISMA_VERSION="$(node -p "require('/app/package.json').devDependencies.prisma")" \
    && mkdir -p /opt/prisma-cli \
    && cd /opt/prisma-cli \
    && npm init -y > /dev/null \
    && npm install --no-audit --no-fund --loglevel=error "prisma@${PRISMA_VERSION}" \
    && npm cache clean --force > /dev/null 2>&1 \
    && node /opt/prisma-cli/node_modules/prisma/build/index.js --version > /dev/null

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
