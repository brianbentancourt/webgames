# 08 · Cliente TV

Referencia: `juegos/salvese/tv/`.

**Renderer tonto** (`D4`). Recibe `VistaTV` y pinta. No calcula reglas, no guarda
estado de juego, no decide cuándo animar.

## Se mira de reojo, no se lee

Diseñado para 3 metros:

| Restricción | Valor |
|---|---|
| Tipografía mínima | ~3% del alto de pantalla (`--texto-min: 3vh`) |
| Margen por overscan | 5% (`--overscan: 5vh`) |
| Scroll | Ninguno. Todo entra en una pantalla |
| Hover | No existe. No hay puntero |
| Números en pantalla | Sólo el reloj, y sólo en los últimos 30 segundos |

Si algo hay que leer para entender qué está pasando, está mal resuelto. El estado
del grupo se comunica con siluetas, posición y luz.

## Dirección de arte

Siluetas planas, **teatro de sombras**. Paleta de noche en capas: el cerro lejano
más claro por perspectiva atmosférica, el cercano casi negro. La brasa es el único
color cálido de la pantalla y por eso el ojo va ahí solo.

Todo sale de `tablero.paleta` y `tablero.cerros` — la TV no tiene colores propios
más allá de la tinta del texto.

## La fogata es el reloj

No hay barra de progreso ni contador (`D3`). La llama se consume, el halo se achica
y **la luz sobre los viajeros baja con ella**. Dígitos sólo en los últimos 30
segundos.

Es información, atmósfera y presión en un solo elemento, y es el elemento firma del
tablero. Un contador numérico haría lo mismo peor: informaría sin poner nada en el
aire.

`vista.reloj` viene 0..1 y `vista.mostrarDigitos` dice cuándo aparecen los números.
El cliente no calcula el tiempo restante contra su propio reloj más que para
interpolar entre mensajes.

## Tres niveles de animación y nada más

| Nivel | Duración | Cuándo |
|---|---|---|
| **Ambiente** | permanente y bajo | Fuego, brasas, estrellas. Nunca compite con nada |
| **Resolución** | 7 s, una vez por noche | La caravana avanza. Es el momento en que todos se callan y miran juntos |
| **Alerta** | 1–2 s | Apareció un objeto, alguien se quebró, el perro se paró |

**El movimiento sincroniza al grupo.** Si la pantalla se mueve todo el tiempo, se
pierde esa herramienta y la cutscene deja de ser un respiro. Todo lo dramático se
guarda para la resolución.

## El fogón revela las boletas

`panel-fogon` es el contenido propio del fogón (D18), no un texto de relleno: dos
columnas —ruta y raciones— con quién votó qué, con nombre, y la opción ganadora
marcada; abajo, a quién se mandó al esfuerzo y quién repartió, si hubo Capataz
(D19). Sale de `vista.revelacion`, que solo llega poblado en `fase === 'fogon'` y
en `epilogo`. Mismas reglas de legibilidad a 3 metros que el resto: tipografía
grande, sin scroll, todo en una pantalla.

`TIEMPOS.fogonMs` es 30 segundos, no 15: alcanza para leer la revelación completa y
para que alguien diga *"¡vos dijiste que ibas al río!"* antes de que se apague.

**El epílogo pinta la misma revelación**, en su variante `revelacion-compacta`
bajo el título "La última noche". No es un extra: cuando la travesía termina, la
máquina va de `resolver` **directo a `epilogo` salteando `fogon``**, así que la
boleta de la última noche —la 5, la que el Capataz decide solo (`capataz_solo`)—
o se muestra ahí o no se muestra en ninguna parte. Es exactamente el motivo por el
que `ultimaRevelacion` vive en `EstadoPartida` y no se deriva de `nocheActual`,
que para entonces ya no existe.

`panel-epilogo` tiene fondo propio como `panel-fogon`. Sin él las tarjetas de
objetivos caen encima de la fogata con 3+ jugadores (era el bug de layout de
M3.5), y con la revelación adentro el panel es más alto todavía.

## Los gatillos

La TV se entera de que tiene que animar por `vista.gatillos`, no comparando estados.

Si comparara —"antes el avance era 3, ahora 6, animo"— una reconexión en el medio
de la noche 4 dispararía la cutscene de una noche que ya pasó, con la mesa mirando
una animación que no corresponde. Por eso el servidor manda el gatillo explícito y
la TV que vuelve de un corte **aparece en el estado posterior sin reproducir nada**.

## El perro

Segundo foco de vida de la escena: duerme junto al fuego y se levanta cuando algo
viene. Es el único dato público del juego, así que su animación es la única que
puede interrumpir la charla sin ser una cutscene.

## Imágenes

Librería propia de fondos; el modelo elige cuál y con qué tinte. **Nada de
generación en el camino crítico**: latencia impredecible y deriva de estilo entre
noches. Que la noche 2 y la noche 4 no parezcan el mismo juego es peor que un fondo
repetido.

## Accesibilidad y aparatos

- `prefers-reduced-motion` apaga el ambiente y acorta la resolución. La
  información nunca está sólo en el movimiento.
- Contraste alto por default: se juega con la luz del living prendida.
- Sin dependencias de fuentes externas: en un Chromecast puede no haber red buena
  y una fuente que no carga rompe el layout entero.
- Nada de `localStorage` para estado de juego. La TV es reemplazable en cualquier
  momento.

## Google Cast

Un receiver de Cast **es** una web app (`D13`): el build actual corre casi sin tocar
nada. Elimina el "cómo lo pongo en la tele" sin tienda ni certificación.

Requisitos que ya condicionan el código: HTTPS obligatorio, sin interacción de
usuario en la pantalla (el receiver no tiene input) y arranque rápido. Las apps
nativas quedan para cuando haya señal de que los grupos vuelven a jugar — el costo
real no es el código, es el impuesto permanente de certificaciones y QA en aparatos.
Ver [`docs/deploy.md`](../../../../docs/deploy.md).
