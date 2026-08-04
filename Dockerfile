# Un solo contenedor: sirve el menú, los clientes de cada juego y el WebSocket
# desde el mismo origen. Pensado para caer en una máquina que ya está prendida.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/portal/package.json apps/portal/
COPY apps/servidor/package.json apps/servidor/
COPY juegos/salvese/core/package.json juegos/salvese/core/
COPY juegos/salvese/tableros/package.json juegos/salvese/tableros/
COPY juegos/salvese/tv/package.json juegos/salvese/tv/
COPY juegos/salvese/control/package.json juegos/salvese/control/
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
#
# Corre tsx directo, sin pnpm de por medio: `pnpm start` dispara a Corepack, que en
# un contenedor recién creado no tiene el binario de pnpm cacheado y lo baja de
# npm en cada arranque. Eso mete una dependencia de red en el camino crítico de
# arranque — justo lo que este contenedor de un solo servicio quiere evitar — y
# cuando la descarga tarda o falla, el servidor tarda en aceptar conexiones y los
# clientes que ya están conectando quedan colgados sin poder recuperarse solos.
CMD ["apps/servidor/node_modules/.bin/tsx", "apps/servidor/src/index.ts"]
