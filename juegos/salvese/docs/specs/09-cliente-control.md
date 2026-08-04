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

## Bloquear es definitivo

`elegir` se puede mandar muchas veces; `bloquear` cierra la boleta y no se
reabre.

Que sea irreversible es lo que hace que la discusión valga: si se pudiera cambiar
hasta el último segundo, la mesa esperaría a ver qué hacen los demás y no se
hablaría, se miraría. También es lo que impide que el jugador alfa verifique que le
hicieron caso.

Después de bloquear, la pantalla dice qué bloqueó y nada más. Sin cuenta regresiva:
**el reloj está en la TV, que es donde tiene que mirar la mesa.**

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
