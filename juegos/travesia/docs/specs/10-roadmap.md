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

## M2 · La partida por red ⚠️ parcial

El motor conectado a las salas. Vistas proyectadas por rol, timers de fase,
reconexión.

**Criterio**: cinco personas juegan las cinco noches desde sus celulares con la TV
en una laptop. La TV puede ser fea; nadie puede quedarse esperando.

**Hecho** (ver [`control/src/`](../../control/src/)):

- `JuegoControl.tsx` orquesta el wizard de una pantalla por acción: revelación de
  rol → línea de tutorial (noche 1) → `elegir_ruta` / `elegir_raciones` /
  `elegir_esfuerzo` / `entregar_objeto` / `responder_trato` → `bloquear`, con
  reinicio automático al cambiar `noche`/`fase`.
- `Acciones.tsx` tiene un componente por tipo de `Accion` del protocolo.
- `App.tsx` delega en `JuegoControl` en vez del placeholder "Mirá la tele" (seguía
  ahí desde M0).
- Verificado a mano: sala con 2 celulares + TV, noche 1 completa (revelación,
  línea de tutorial de ambos roles, ruta/raciones/esfuerzo, bloqueo, resolución,
  transición limpia a noche 2). Ver `pnpm test` (`maquina.test.ts`, 4 tests) para
  la máquina de estados en sí.

**Pendiente / conocido**:

- `votar_tablero` (acción de fase `lobby`) no tiene pantalla propia — el tipo ya
  existe en `Accion` (`vistas.ts`) pero `JuegoControl`/`Acciones.tsx` sólo muestran
  un placeholder ("Mirá la tele para elegir el tablero"). No estaba en el alcance
  de este hito.
- El nombre legible de un jugador para `elegir_esfuerzo`/`entregar_objeto` sale de
  un mapa `id → nombre` armado en `App.tsx` a partir de los mensajes `sala`
  (D4 no manda nombres en `VistaJugador`, sólo ids). Si alguien se uniera a mitad
  de partida no aparecería en ese mapa — no debería pasar en la práctica, pero no
  hay un mensaje que lo cubra.
- No se hizo un playtest de 5 noches completas ni se ejercitaron a mano `fogon`,
  `entregar_objeto`/`responder_trato` reales, ni reconexión (celular que pierde el
  socket y vuelve) — sólo se leyó el código de `conexion.ts` y la spec de
  reconexión ([09](09-cliente-control.md#reconexión)).

## M3 · La TV que se mira ⚠️ parcial

Escena de fogata, la llama como reloj, la cutscene de 7 segundos, el perro, los
tres niveles de animación.

**Criterio**: la mesa mira la TV en la resolución sin que nadie les diga. Si siguen
mirando el celular durante la cutscene, la cutscene está mal.

**Hecho** (ver [`tv/src/`](../../tv/src/)):

- `JuegoTV.tsx` + `Fogata.tsx` + `Caravana.tsx`: fondo por capas con
  `tablero.paleta`, fogata cuya escala/opacidad sigue `vista.reloj`, dígitos reales
  de cuenta regresiva en los últimos 30s (calculados con `ventanaDecidirMs` desde
  `@travesia/core`, no un texto fijo), panel de candidatos en `decidir`, panel de
  crónica en `resolver`, paneles para `reparto`/`lobby`/`epilogo`.
- Lee `vista.gatillos` para la animación de resolución (nivel "resolución" de la
  spec) en vez de comparar estados.
- `@media (prefers-reduced-motion: reduce)` en `estilos.css` (fogata, alerta,
  resolución acortada a 300ms).
- Verificado a mano en navegador (ver M2): la fogata, el panel de candidatos y el
  panel de resolución con crónica se vieron en una partida real.

**Pendiente / conocido — esto es lo más importante para quien continúe**:

- **El backend nunca emite gatillos de `alerta`.** `proyectarTV` en
  [`core/src/vistas.ts`](../../core/src/vistas.ts) sólo arma
  `gatillos: [{ tipo: 'resolucion' }]` cuando `fase === 'resolver'`; el caso
  `{ tipo: 'alerta', que: 'objeto' | 'quiebre' | 'perro' }` no se genera nunca. El
  cliente ya está preparado para consumirlo (`JuegoTV.tsx` busca
  `gatilloAlerta` y se lo pasa a `Caravana` como prop `alertando`, con su CSS
  `.animar-alerta`), pero como el motor no lo manda, ese pulso nunca se ve. Falta
  decidir en `maquina.ts` en qué transición nace cada alerta y agregarla al efecto
  `publicar` correspondiente.
- **El gatillo de `resolucion` no es un evento de una sola vez.** `proyectarTV` lo
  recalcula en cada mensaje mientras dura la fase `resolver`, no lleva un id ni se
  "consume". En el cliente esto se paliativó con
  `key={`${vista.noche}-resolver`}` en el panel (así no reanima en cada heartbeat
  dentro de la misma noche), pero si la TV se reconecta a mitad de la cutscene sí
  la va a reproducir de nuevo — lo que la spec de gatillos
  ([08](08-cliente-tv.md#los-gatillos)) dice explícitamente que no debe pasar. Para
  cumplirlo al pie de la letra hace falta un cambio de protocolo: un id de gatillo
  o una marca de "ya se consumió" en el estado/conexión.
- El panel de `epilogo` es un placeholder de una línea ("La travesía terminó. Miren
  la ronda final.") sin la crónica final ni resumen — el epílogo compartible es de
  M5, no de este hito.
- `prefers-reduced-motion` está implementado en CSS pero no se probó a mano
  activándolo en el navegador (paso 6 del plan de verificación, pendiente).
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
