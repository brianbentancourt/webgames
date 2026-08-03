# Un solo contenedor: sirve el menú, los clientes de cada juego y el WebSocket
# desde el mismo origen. Pensado para caer en una máquina que ya está prendida.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/portal/package.json apps/portal/
COPY apps/servidor/package.json apps/servidor/
COPY juegos/travesia/core/package.json juegos/travesia/core/
COPY juegos/travesia/tableros/package.json juegos/travesia/tableros/
COPY juegos/travesia/tv/package.json juegos/travesia/tv/
COPY juegos/travesia/control/package.json juegos/travesia/control/
RUN pnpm install --frozen-lockfile

COPY . .
# Construye el menú y los clientes de todos los juegos.
RUN pnpm -r build

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production PUERTO=8787

COPY --from=build /app ./

EXPOSE 8787
# El servidor detecta los `dist` y los monta solo. Ver apps/servidor/src/juegos.ts
CMD ["pnpm", "--filter", "@juegos/servidor", "start"]
