# 10 · Roadmap

Cada hito tiene un criterio de salida que se puede verificar, no una sensación. Y
cada uno termina en algo que se puede probar con gente.

## M0 · Estructura ✅

Monorepo, tipos, protocolo, tableros, lobby funcionando.

**Criterio**: `pnpm -r typecheck` pasa, el servidor levanta, dos celulares entran a
una sala y la TV los muestra. ✅

## M1 · El motor, en una terminal

`reducir()` implementado para una travesía completa. Sin red, sin UI, sin modelo.

- Conteo de boletas con sus cuatro vías de resolución
- Los doce pasos del orden de resolución ([03](03-reglas-de-resolucion.md))
- El perro, el trato, los objetos, la ceguera, la noche 5
- Un runner de terminal que juega una travesía con boletas por stdin

**Criterio de salida**: se juega una travesía entera en la terminal y **el loop de
una noche es interesante sin animaciones**. Si no lo es, no se sigue: no lo va a
salvar ninguna cutscene. Es el único hito que puede terminar en "volver al diseño".

## M2 · La partida por red ✅

El motor conectado a las salas. Vistas proyectadas por rol, timers de fase,
reconexión.

**Criterio**: cinco personas juegan las cinco noches desde sus celulares con la TV
en una laptop. La TV puede ser fea; nadie puede quedarse esperando. ✅ — verificado
con un playtest automatizado real (no el motor en memoria: WebSocket de punta a
punta, timers del servidor incluidos). Ver
[`apps/servidor/scripts/e2e-playtest.mjs`](../../../../apps/servidor/scripts/e2e-playtest.mjs);
se corrió varias veces y entre esas corridas se ejercitaron los cinco caminos que
quedaban sin probar: `votar_tablero`, `responder_trato`, `entregar_objeto`,
reconexión a mitad de partida, y una travesía completa hasta el epílogo.

**Hecho** (ver [`control/src/`](../../control/src/)):

- `JuegoControl.tsx` orquesta el wizard de una pantalla por acción: revelación de
  rol → línea de tutorial (noche 1) → `elegir_ruta` / `elegir_raciones` /
  `elegir_esfuerzo` / `entregar_objeto` / `responder_trato` → `bloquear`, con
  reinicio automático al cambiar `noche`/`fase`.
- `Acciones.tsx` tiene un componente por tipo de `Accion` del protocolo, incluido
  `PantallaEntregarObjeto` (antes faltaba: un jugador con objeto en `acampar` o
  `fogon` quedaba en una pantalla en blanco, sin forma de avanzar).
- `elegir_esfuerzo.opciones` y `entregar_objeto.candidatos` llevan `{id, nombre}`
  en vez de solo el id (`vistas.ts`): la vista es autocontenida, el cliente no
  reconstruye un mapa id→nombre a partir de mensajes previos de la sala.
- La votación de tablero tiene pantalla propia en el lobby de `control/App.tsx`
  (antes del "listo"), con conteo en vivo, y la TV muestra la misma cuenta. El
  mensaje `sala` manda `tableros[]` y `votos{}` (`protocolo.ts`).
- **Bug encontrado y corregido**: `apps/servidor/src/index.ts` usaba el mismo
  campo (`sala.timerId`) para la cuenta regresiva del lobby y para el reloj de
  fase de una partida en curso. Reconectar un celular a mitad de una noche
  cancelaba ese campo sin querer y con él el único timer que hace avanzar la
  partida — la travesía quedaba congelada para siempre, en silencio, sin ningún
  error. Lo encontró el playtest automatizado al ejercitar reconexión real, no
  una revisión de código. Separado en `lobbyTimerId` / `faseTimerId`
  (`salas.ts`).
- `App.tsx` delega en `JuegoControl` en vez del placeholder "Mirá la tele" (seguía
  ahí desde M0).

## M3 · La TV que se mira ✅

Escena de fogata, la llama como reloj, la cutscene de 7 segundos, el perro, los
tres niveles de animación.

**Criterio**: la mesa mira la TV en la resolución sin que nadie les diga. Si siguen
mirando el celular durante la cutscene, la cutscene está mal. ✅ — la cutscene dura
lo que tiene que durar (ver el bug de abajo) y `prefers-reduced-motion` se verificó
de verdad en un Chromium real, no solo leyendo el CSS.

**Hecho** (ver [`tv/src/`](../../tv/src/)):

- `JuegoTV.tsx` + `Fogata.tsx` + `Caravana.tsx`: fondo por capas con
  `tablero.paleta`, fogata cuya escala/opacidad sigue `vista.reloj`, dígitos reales
  de cuenta regresiva en los últimos 30s (calculados con `ventanaDecidirMs` desde
  `@travesia/core`, no un texto fijo), panel de candidatos en `decidir`, panel de
  crónica en `resolver`, paneles para `reparto`/`lobby`/`epilogo`.
- Los gatillos de animación (`resolucion`, y ahora `alerta` con
  `que: 'objeto' | 'quiebre' | 'perro'`) viajan en el efecto `publicar` de la
  transición que los dispara, no se recalculan de `estado.fase` al proyectar
  (`maquina.ts` + `vistas.ts`). Es lo que hace que reconectar a mitad de la
  cutscene **no** la repita para toda la mesa: una republicación que no viene de
  esa transición —reconexión, heartbeat— no trae ningún gatillo.
- `Caravana.tsx` pulsa al viajero que se quebró o al que encontró un objeto según
  el gatillo de alerta, además del perro (que ya estaba).
- El panel de `epilogo` muestra el desenlace real —llegaron o no, si el perro
  llegó, la última crónica, y los objetivos personales de cada uno cumplidos o
  no— en vez del placeholder de una línea de antes.
- **Bug encontrado y corregido**: el reloj de `resolver` (7s) era un techo, no un
  piso. `maquina.ts` trataba `relato_listo` exactamente igual que `vencio_fase`
  en esa fase, así que en cuanto llegaba el texto —cosa que sin
  `ANTHROPIC_API_KEY` pasa casi en el mismo tick, porque `pedirRelato` devuelve
  el respaldo sin esperar nada— la fase saltaba a `fogon` de inmediato. La
  cutscene se veía, en la práctica, una fracción de segundo en vez de 7. Es el
  modo por defecto del juego (sin clave, con respaldos) el que quedaba roto, no
  un caso raro. Ahora `relato_listo` solo actualiza el texto de la crónica sin
  adelantar la fase; sólo `vencio_fase` cierra la noche. Confirmado con un
  Chromium real: [`apps/servidor/scripts/pw-reduced-motion.mjs`](../../../../apps/servidor/scripts/pw-reduced-motion.mjs)
  mide la `animation-duration` calculada de `.panel-resolucion` en vivo (7000ms
  sin preferencia, 300ms con reduced-motion) — no solo lee el CSS.
- `@media (prefers-reduced-motion: reduce)` en `estilos.css` (fogata, alerta,
  resolución acortada a 300ms), verificado en navegador real con Playwright.

**Pendiente / conocido**:

- El epílogo **compartible** (URL, crónica exportable) es de M5, no de este hito;
  lo que hay ahora es la vista en la TV nada más.
- El motor evalúa los objetivos de El Salitral (`agua-de-sobra`, `nunca-la-aguada`,
  `cruzar-la-sal`) con el mismo `default: cumplido = llegaron` que cualquier
  objetivo no reconocido — el `switch` de `maquina.ts` (fase `resolver`) sólo
  tiene casos explícitos para los de La Sierra. No es un bug de esta ronda: nunca
  estuvo cubierto, y El Salitral es jugable igual, solo que esos tres objetivos no
  se evalúan como dicen.
- Cast/receiver (`D13`) y deploy siguen siendo M5, no se tocaron acá.

## M4 · El modelo

Llamada real, presupuesto de tiempo, respaldos, las cinco escenas.

**Criterio**: cortás la red en el medio de una partida y **la mesa no se entera**.
Ese es el test, no la calidad de la prosa.

## M5 · Que se pueda jugar sin vos

Deploy ([`docs/deploy.md`](../../../../docs/deploy.md)), receiver de Cast, votación de tablero, epílogo con
crónica compartible.

**Criterio**: un grupo que no conocés juega una travesía entera sin ayuda, y
**vuelve a jugar otra**. Lo segundo es lo que importa: es lo único que justifica
empezar a pensar en apps nativas (`D13`).

## Lo que no entra al MVP

`D15`: cada sistema nuevo es una regla más que explicar. El techo no es cuánto se le
puede meter, es cuánto puede sostener una conversación de cinco personas sin que
alguien mire el celular.

| Descartado del MVP | Por qué |
|---|---|
| Economía, crafteo, progresión de habilidades | Reglas que explicar sin nada que agreguen a la charla |
| Cuentas de usuario | Un nombre por partida alcanza |
| Salas públicas / matchmaking | Este juego es para gente en el mismo living |
| Apps nativas de TV | El costo no es el código: es el impuesto de certificaciones y QA (`D13`) |
| Más de dos tableros | Dos ya obligan a abstraer bien, que era el punto (`D12`) |
| La versión de 7 noches | Queda como tablero desbloqueable (`D7`) |
| Chat, historial, sonido en el celular | La conversación es el juego (`D1`) |

## El orden importa

M1 antes que M2 antes que M3 no es burocracia: **es el orden que hace que un juego
malo se descubra barato.** Si la TV se construye primero, el sesgo de haber hecho
la animación linda impide ver que la noche no es interesante.
