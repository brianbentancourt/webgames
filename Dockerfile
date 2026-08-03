# Un solo contenedor: sirve los dos clientes y el WebSocket desde el mismo origen.
# Pensado para caer en una máquina que ya está prendida, al lado de todo lo demás.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY packages/tableros/package.json packages/tableros/
COPY apps/server/package.json apps/server/
COPY apps/tv/package.json apps/tv/
COPY apps/control/package.json apps/control/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @travesia/tv build && pnpm --filter @travesia/control build

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production PUERTO=8787

COPY --from=build /app ./

EXPOSE 8787
# El servidor detecta los `dist` y los monta solo. Ver apps/server/src/estaticos.ts
CMD ["pnpm", "--filter", "@travesia/server", "start"]
