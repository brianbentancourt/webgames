# Juegos

Juegos web para jugar con amigos en el living. **La TV es el tablero, los celulares
son las cartas.**

Nada de esto es para jugar solo ni en línea con desconocidos: la premisa es gente
sentada en el mismo sillón, hablando. El menú vive en la raíz y cada juego cuelga de
su ruta.

## Los juegos

| Juego | Jugadores | Dura | Estado |
|---|---|---|---|
| [Sálvese quien pueda!](juegos/salvese/) — cinco noches en la sierra: ¿seguís o te volvés con lo que cargás? | 3 a 10 | 15 min | jugable, falta playtest con gente |

## Estructura

```
/apps
  /portal      el menú — lista los juegos, no sabe nada de ninguno
  /servidor    proceso único: salas, WebSocket y sirve todos los estáticos
/juegos
  /salvese    un juego es una carpeta con todo lo suyo adentro
    /core        tipos y reglas, sin dependencias de framework
    /tableros    escenarios como datos
    /tv          cliente de TV
    /control     cliente de celular
    /docs        diseño y specs de este juego
/docs
  decisiones.md  por qué las cosas son como son, con lo que se descartó
  deploy.md      dónde corre esto
/deploy
  /cloudflared   publicar el repo en un dominio propio
```

**Agregar un juego** es agregar una carpeta en `/juegos` y una entrada en
`apps/servidor/src/juegos.ts`. De ahí salen las rutas que se montan y la lista que
pinta el menú: no hay una segunda lista que se pueda desincronizar.

## Cómo se corre

```
pnpm install
pnpm dev          # servidor 8787 · portal 5172 · tv 5173 · control 5174
```

Los celulares entran por la IP de la máquina en la misma red: alcanza para las
primeras mesas y no hace falta desplegar nada.

`pnpm -r typecheck` · `pnpm test` · `pnpm -r build` — o las tres seguidas con
`pnpm verificar`. Ninguna de las dos primeras mira CSS ni assets: el `build`
es el que hubiera agarrado el bundle de la TV roto que las otras dos dejaron
pasar en verde. Correrlo antes de todo deploy.

## Cómo se publica

```
docker compose up -d --build
```

Un contenedor que sirve el menú, los clientes de cada juego y el WebSocket desde el
mismo origen, más un túnel de Cloudflare que lo publica con HTTPS sin abrir puertos
en el router. Pasos en [`deploy/cloudflared/README.md`](deploy/cloudflared/README.md),
el porqué en [`docs/deploy.md`](docs/deploy.md).

## Lo que comparten todos los juegos

**El estado vive en el servidor. La TV solo se suscribe y pinta.** Las animaciones se
disparan por transición de estado, nunca por lógica del cliente. Eso hace que
reconectar sea trivial —llega el estado, se repinta— y que una app nativa de TV en el
futuro sea una carcasa alrededor del mismo cliente web, no un port.

**El modelo no lleva el estado.** El motor determinista lleva reglas y resolución; el
LLM elige de un menú de jugadas válidas que le arma el motor y escribe la piel.

Las dos están argumentadas en [`docs/decisiones.md`](docs/decisiones.md).
