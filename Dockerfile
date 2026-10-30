# Один образ на оба контура: регион, домен и хранилище задаются переменными окружения.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/player/package.json apps/player/
COPY packages/shared/package.json packages/shared/
COPY packages/renderer/package.json packages/renderer/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm --filter @dm/api deploy --prod --legacy /out/api

FROM node:22-bookworm-slim
# ffmpeg перекодирует видео-фоны в H.264 для ТВ-приставок.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/media && chown node:node /data/media
WORKDIR /app/apps/api
COPY --from=build /out/api ./
COPY --from=build /app/apps/admin/dist /app/apps/admin/dist
COPY --from=build /app/apps/player/dist /app/apps/player/dist
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 STORAGE_DIR=/data/media
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
