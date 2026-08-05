# 09 · Cliente celular

Referencia: `juegos/salvese/control/`.

**Ningún jugador toca el celular más de 10 segundos por ronda** (`D1`). Todo lo que
dure más es tiempo en el que la mesa está cabizbaja y en silencio, que es
exactamente lo que este juego no quiere ser.

El celular no es la pantalla del juego: es la carta que tenés en la mano.

## Una acción por pantalla

Nunca dos. La pantalla de `decidir` no muestra ruta, raciones y esfuerzo juntas:
muestra una, se elige, aparece la siguiente. Tres toques y bloquea.

`acciones` vacío es una pantalla válida y buscada: dice *"no te toca, hablá"*. Un
celular apagado en la mano durante dos minutos es el estado normal del juego.

## Presupuesto de lectura

| Elemento | Máximo |
|---|---|
| Título de pantalla | 4 palabras |
| La línea o la pregunta | 20 palabras |
| Etiqueta de opción | 3 palabras |
| Opciones simultáneas | 3 |

Si una pantalla necesita un párrafo, la mecánica que hay detrás está mal diseñada
para este juego. Ese es el filtro que descartó las mecánicas de escribir y dibujar
en el celular (`D1`).

## Tamaños

- Botones de **64 px de alto** mínimo: se tocan sin mirar, en penumbra, con el
  fuego de la TV como única luz.
- Un solo botón primario por pantalla, siempre en el mismo lugar. La mano aprende
  dónde está y deja de mirar.
- `env(safe-area-inset-*)` para que el botón no quede debajo de la barra del
  teléfono.
- Sin scroll. Si no entra, sobra contenido.

## La línea

En la noche 1 el celular **no ofrece opciones, dicta qué decir en voz alta** (`D8`):

```
Decí en voz alta que la ruta de la izquierda
tiene agua pero es más larga.
```

Tipografía grande, sin botones de decisión, un solo "listo". Es el tutorial
encubierto: nadie lee reglas nunca. **Si al primer minuto no están jugando, se
perdió la mesa.**

Las habilidades se abren de a una hasta la noche 3, así que las pantallas nuevas
aparecen espaciadas y ninguna necesita explicación.

## El reparto del esfuerzo

`repartir_esfuerzo` (D19) es una pantalla de selección múltiple —hasta 3, con un
botón de confirmar— independiente de la boleta: no hace falta haber bloqueado ruta
y raciones para verla, ni al revés. Se le ofrece al Capataz si hay uno en la mesa;
si no, a **cada** jugador, con `modo: 'voluntario'` y una sola opción, él mismo.

Los que no se pueden elegir —fueron la noche anterior, o están quebrados— se
muestran igual, deshabilitados con su motivo (`disponible: false, motivo: '...'`)
en vez de desaparecer: que se vea por qué no se puede es parte de la conversación,
no algo para esconder.

**En la noche 1 esta pantalla no existe**: no se reparte esfuerzo (D8, se decide
una sola cosa) y el servidor rechaza el comando además de no ofrecer la acción.

## Mandar al perro a explorar

`mandar_perro` (A2, D10) es una pantalla propia, igual que `repartir_esfuerzo`:
independiente de la boleta, se le ofrece solo al Capataz, desde la noche 3 y solo
si el perro sigue presente. Sin Capataz en la mesa, esta pantalla no existe para
nadie — a diferencia del esfuerzo, acá no hay modo voluntario.

El copy tiene que dejar claro que se lo puede perder: es una decisión que se dice
en voz alta con el grupo, no un trámite. Dos botones, "mandarlo" y "que se quede",
y **los dos mandan el comando** — `manda: true` y `manda: false`. "Que se quede"
es una respuesta, no un silencio.

La pantalla se apaga con `yaDecidio`, no con `yaMandado`. Son distintos a
propósito:

| Campo | Qué dice |
|---|---|
| `yaDecidio` | El Capataz ya contestó, haya dicho que sí o que no |
| `yaMandado` | El perro está afuera esta noche |

Sin `yaDecidio`, "dijo que se quede" y "todavía no contestó" son indistinguibles
del lado del servidor, y el celular tiene que acordarse solo: un `useState` que se
pierde al recargar, con lo cual el Capataz que dijo que no y bloquea la pantalla
del teléfono vuelve a encontrarse la pregunta a mitad de la noche. Es el mismo
error que ya se había cometido con el reparto del esfuerzo, y la misma solución
—registrar la respuesta en el servidor— porque el estado vive ahí (D4).

Por eso `EstadoNoche` lleva `perroDecidido` además de `perroExplorando`, igual que
lleva `esfuerzoRespondieron` además de `esfuerzoAsignado`. Cuando una respuesta
válida deja el estado igual que no responder, hace falta un campo que registre que
hubo respuesta.

Una sola respuesta por noche: después de contestar no se puede cambiar de idea, en
ningún sentido. Poder retirarlo después de mandarlo sería sacarlo del riesgo
gratis.

Si el perro volvió de explorar la noche anterior, la pantalla de elegir ruta
(`PantallaRuta`) muestra el tramo más duro revelado (`VistaJugador.perroTramoRevelado`):
es información pública y llega justo cuando hace falta, al elegir por dónde ir.

### Que ya repartió lo dice el servidor, no el celular

La acción trae `yaReparti` y `yaAsignado`, y el cliente pinta a partir de eso:
`yaReparti` decide si la pantalla se fuerza, `yaAsignado` precarga la selección.
Nada de estado local (D4).

Con un `useState` en el celular parecía funcionar y se rompía al recargar: se
perdía el "ya repartí", el servidor seguía ofreciendo la acción, y el Capataz
volvía a ver la pantalla de reparto a mitad de la noche pudiendo pisar sin querer
lo que ya había decidido. `yaReparti` tampoco se puede derivar de `yaAsignado`:
repartir "a nadie" y todavía no haber repartido son los dos una lista vacía, y por
eso `EstadoNoche` lleva `esfuerzoRespondieron` aparte.

## Bloquear es definitivo

`elegir` se puede mandar muchas veces; `bloquear` cierra la boleta y no se
reabre.

Que sea irreversible es lo que hace que la discusión valga: si se pudiera cambiar
hasta el último segundo, la mesa esperaría a ver qué hacen los demás y no se
hablaría, se miraría. También es lo que impide que el jugador alfa verifique que le
hicieron caso.

Después de bloquear, la pantalla dice qué bloqueó y nada más. Sin cuenta regresiva:
**el reloj está en la TV, que es donde tiene que mirar la mesa.**

## El epílogo revela lo tuyo

Hasta A3, en `epilogo` el celular repetía el mismo "no te toca ninguna acción"
genérico que usó toda la partida: el objetivo personal —cumplido o no— se veía
solo en la TV. Veinticinco minutos sosteniendo el teléfono, y la persona que más
le prestó atención a su rol era la que menos se enteraba de cómo terminó.

`VistaJugador.miDesenlace` trae el objetivo propio (texto de `OBJETIVOS_TEXTO`),
si se cumplió, y si la caravana llegó. `JuegoControl.tsx` lo intercepta antes que
cualquier otra pantalla —ni wizard, ni "hablá con el grupo"— con `PantallaEpilogo`
(`Acciones.tsx`).

Los cuatro cuadrantes se leen distinto a propósito (D21): llegar con la caravana
pero fallar lo tuyo no es lo mismo que al revés. `PantallaEpilogo` separa los
cuatro con título y remate propios en vez de una sola frase con dos booleans
pegados.

`miDesenlace` **no** trae el objetivo de nadie más: eso sigue siendo de la TV
(`VistaTV.desenlace.objetivos`), que ya lo muestra completo — la revelación
conjunta es el momento de la mesa, no del celular de cada uno.

## Reconexión

El token de sesión vive en `localStorage`. Al reconectar se manda en `unirse` y el
jugador vuelve a su asiento con el estado completo.

Casos que hay que dar por descontados, no tratar como excepción:

- Se bloqueó la pantalla y iOS cortó el socket → `visibilitychange` reconecta.
- Se fue el wifi y volvió → backoff exponencial hasta 8 s.
- Cerró la pestaña sin querer → entra de nuevo con el mismo código y vuelve a su rol.
- No volvió nunca → el motor completa su boleta y la partida sigue
  ([03 · Boleta ausente](03-reglas-de-resolucion.md)).

Nada de esto puede hacer esperar a la mesa. Una partida de 25 minutos no puede
frenarse porque a alguien se le trabó el teléfono.

## Lo que el celular deliberadamente no tiene

- **Chat.** La conversación es el juego y pasa en el aire.
- **Historial.** Lo que pasó se cuenta en la TV, mirándola todos juntos.
- **Sonido.** El audio sale de un solo lado o no sale.
- **Vibración**, salvo un pulso corto al confirmar el bloqueo.
- **Números del estado del grupo.** Eso es la habilidad de un rol, no un HUD.
- **Cuenta regresiva.** Ver arriba.
