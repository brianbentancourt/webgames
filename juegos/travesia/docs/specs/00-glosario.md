# 00 · Glosario

Una palabra por cosa. Si en la mesa se dice "ronda" y en el código `EstadoNoche`,
alguien va a perder media hora entendiendo por qué no hay `Ronda`.

## Palabras del juego

| Palabra | Qué es | En el código |
|---|---|---|
| **Travesía** | Una partida entera: 3 a 7 noches según el tablero | `EstadoPartida` |
| **Noche** | Una vuelta del loop `acampar → decidir → resolver → fogón` | `EstadoNoche` |
| **Caravana** | El grupo. No es una entidad: es la lista de viajeros | `viajeros` |
| **Viajero** | Un jugador dentro de la ficción | `Viajero` |
| **Asiento** | El lugar en el reparto. Dos asientos del mismo rol son una pareja | `asiento` |
| **Tramo** | Una de las rutas candidatas de la noche | `Tramo` |
| **Boleta** | Lo que un jugador bloqueó en su celular. Secreta hasta que resuelve | `Boleta` |
| **Vigor** | Cuánto aguanta un viajero. 0 a 3; en 0 está quebrado | `Vigor` |
| **Recurso crítico** | Raciones en La Sierra, agua en El Salitral. Siempre hay uno solo | `recurso` |
| **El trato** | La oferta privada, una por travesía o ninguna (`D9`) | `tratoOfrecidoA` |
| **Crónica** | El registro de lo que pasó. Es el producto real de la partida | `EntradaCronica` |
| **La voz del camino** | El registro del relato de cada tablero | `vozDelCamino` |
| **Fogón** | Los 30 segundos finales donde el camino hace la pregunta incómoda | fase `fogon` |

## Palabras del código

| Término | Qué es |
|---|---|
| **Estado autoritativo** | `EstadoPartida`. Vive en el servidor y no sale nunca (`D4`) |
| **Vista** | Proyección del estado para un cliente. `VistaTV` o `VistaJugador` |
| **Comando** | Intención que entra al motor. Sale de un mensaje o de un timer |
| **Efecto** | Lo que el motor pide que el mundo haga: agendar, publicar, pedir relato |
| **Gatillo** | Aviso a la TV de que arranque una animación. Nunca lo decide el cliente |
| **Arquetipo** | Plantilla de objeto con efecto mecánico duro. El modelo elige, no inventa |
| **Respaldo** | Texto del tablero que se usa cuando el modelo no llega a tiempo (`D6`) |
| **Menú de jugadas válidas** | Las opciones que el motor le ofrece al modelo (`D5`) |

## Convenciones

**El código está en español**, incluidos tipos y campos. La razón es que el dominio
está en español y traducir `baqueano` a `pathfinder` sólo agrega un diccionario que
alguien va a tener que mantener en la cabeza. La excepción son las palabras del
lenguaje y de las librerías: `useEffect`, `export`, `WebSocket`.

**Sin abreviaturas.** `jugador`, no `jug`. Se escribe una vez y se lee mil.

**Los identificadores son `kebab-case`** en los datos (`la-lengua-de-sal`) y
`camelCase` en el código. Los ids de partida y jugador son UUID.

**Los tiempos son milisegundos** y los nombres de campo terminan en `Ms`. Las marcas
de tiempo absolutas son `Date.now()` del servidor: el reloj del cliente no se usa
para nada que decida algo.
