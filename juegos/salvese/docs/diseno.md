# Sálvese quien pueda! — Diseño

## Pilares

1. **Todos juegan siempre.** Nadie espera turno. Cada vuelta, todos deciden a la vez.
2. **Un toque, una revelación.** El celular se usa un segundo; la tele muestra el resultado
   enseguida, y el resultado es lo que se grita.
3. **La codicia se ve.** Lo que arriesgás es público, lo que guardaste es secreto.
4. **La partida deja una anécdota.** "Se volvió solo y se llevó todo" es el producto real.

---

## Una noche

```
PRESENTACIÓN → TRAMO → ¿SIGO O ME VUELVO? → RETIRADA ─┐
   (4 s)       (3 s)        (≤15 s)            (4 s)   │
                 ▲                                     │
                 └──── queda alguien en el camino ─────┘
```

- **Tramo.** La tele da vuelta una carta del mazo de la noche.
  - **Hallazgo**: un número. Se divide parejo entre los que siguen en el camino; lo que
    no se puede dividir queda **tirado** en ese tramo.
  - **Peligro**: el primero de cada tipo es un susto y no pasa nada. **El segundo del
    mismo tipo es la emboscada**: los que siguen en el camino pierden todo lo que cargan
    y la noche se termina. Una copia de ese peligro sale del juego.
- **¿Sigo o me vuelvo?** Cada uno toca en secreto. La ventana se cierra cuando eligieron
  todos o a los 15 segundos; el que no eligió, sigue.
- **Retirada.** Se revela todo junto. Los que se vuelven guardan su mochila en el baúl y
  se reparten lo tirado en el camino. Si vuelve uno solo, se lo lleva todo.
- La noche termina cuando no queda nadie en el camino o cuando hay emboscada. Después viene
  el **balance**: qué ganó y qué perdió cada uno esa noche. El baúl sigue siendo secreto.

Cinco noches. Gana el baúl más lleno.

---

## Qué es público y qué no

| Dato | Dónde | Por qué |
|---|---|---|
| Lo que carga cada uno | TV | Es lo que se arriesga: la mesa tiene que poder señalarlo |
| Peligros que ya salieron esta noche | TV, arriba, grande | Es todo lo que hace falta para calcular el riesgo |
| Lo tirado en el camino | TV | Es la tentación de volverse |
| Quién ya eligió | TV (✓, sin decir qué) | Presión sobre el indeciso |
| Qué eligió cada uno | TV, recién en la retirada | El desfasaje es el momento del grito |
| El baúl | Solo tu celular | Nadie sabe con certeza quién gana: el bluff vive de eso |

---

## El perro

Antes de cada decisión olfatea la próxima carta y pone una cara, en la tele, para todos:

| Viene | tranquilo | inquieto | gruñe |
|---|---|---|---|
| El segundo de un peligro (letal) | 10% | 15% | **75%** |
| Un peligro nuevo | 30% | **50%** | 20% |
| Plata | **70%** | 20% | 10% |

Acierta casi siempre, nunca siempre. Un oráculo mata la discusión; un perro que a veces se
equivoca la arranca ("¡gruñó la última vez y salió plata!").

---

## Premios del final

Salen de la conducta, no de un texto escrito. Uno por categoría, si alguien lo hizo al
menos una vez. Si empatan en la punta lo comparten ("Beto y Emi"); si empata toda la mesa,
no hay premio:

- **El codicioso**: perdió más de una sola vez.
- **El vivo**: se volvió solo y se llevó lo tirado.
- **El gallina**: fue el primero en pegar la vuelta más noches.
- **El temerario**: lo agarraron más veces.
- **El último en irse**: se quedó hasta el final y volvió entero.

---

## Tableros

Un tablero es un paquete de datos (`/tableros`): peligros con su texto de susto y de golpe,
hallazgos con su valor, paleta y fondos. **Cada tablero cambia una regla, no solo la piel.**

| Tablero | Qué cambia |
|---|---|
| La Sierra | El base: tres copias de cada peligro, plata del 1 al 15 |
| El Salitral | Cuatro copias de cada peligro, pero todo vale más. Volverse temprano y odiar al que se quedó |

Se vota desde los celulares en la sala.

---

## Calibración

`apps/servidor/src/travesia.test.ts` juega cientos de partidas por tablero con bots que
estiman el riesgo como una mesa (peligros a la vista contra lo que cargan) y vigila la
forma, no los números exactos:

- a cada jugador lo agarran entre 15% y 55% de las noches (hoy ~35%);
- una noche dura entre 4 y 12 tramos (hoy ~7);
- ninguna estrategia gana más de la mitad de las partidas;
- la partida entra en 6 a 20 minutos (hoy ~12).

Lo que la simulación no puede decir es si la mesa se ríe. Eso es el playtest.

---

## Presentación en TV

Se mira de reojo desde el sillón. Tres franjas, siempre en el mismo lugar:

- **Arriba**, el cartel: lo que acaba de pasar, en una frase. Y en la esquina, los peligros a la vista.
- **En el medio**, el camino: las cartas dadas vuelta en fila, la última animada.
- **Abajo**, la gente: a la izquierda el campamento con el fuego (los que se volvieron); a la
  derecha el camino (los que siguen, con lo que cargan encima de la cabeza) y el perro adelante.

El fuego del campamento es el reloj de la decisión: se apaga mientras se piensa. La emboscada
es el único golpe visual del juego: la pantalla se tiñe de rojo y se sacude una vez.

Estética: papel recortado y stop-motion ([`estetica.md`](estetica.md)).

---

## Pantallas: las convenciones

- **Tu color.** Cada asiento tiene un color fijo (`COLORES_ASIENTO` en el core). Es el de tu
  silueta en la tele y el de tu ficha en la cabecera del celular: te encontrás de un vistazo.
- **La sala explica el juego.** La tele en la sala muestra las reglas en tres papelitos, el QR
  y el código grandes, la caravana que se va armando (con lugares vacíos hasta 3) y qué
  tablero va ganando. Nadie tiene que leer las reglas en voz alta.
- **El celular siempre tiene la misma forma**: cabecera (tu ficha, las lunas de la noche, la
  ayuda), un estado (etiqueta chica, titular grande, una línea) y abajo tus dos números:
  *cargás* (se puede perder) y *tu baúl* (secreto). El color del estado dice cómo te fue:
  brasa a salvo, rojo te agarraron, verde guardaste.
- **La decisión ocupa todo el celular.** Dos botones gigantes con lo que implica cada uno
  ("con 3 más", "guardás 12 + hasta 4 tirados"), el reloj arriba, y vibra cuando se abre.
- **Volver al asiento es automático.** Si el socket se corta o la página se recarga, el
  celular se presenta solo con su sesión guardada. Nadie reescribe su nombre en la noche 3.
- **El perro habla en globo** y tiene tamaño de personaje: es el único dato público.
- **Movimiento reducido** apaga las animaciones pero nunca la información: el atrapado queda
  caído igual, la emboscada se tiñe igual.

---

## Riesgos conocidos

- **Dos jugadores.** El motor lo permite, pero sin una mesa a quien ganarle lo tirado el juego
  pierde gracia. La ficha dice 3 a 10.
- **El arriesgado gana más seguido.** Es el punto, pero si en mesa real gana siempre el mismo
  tipo de jugador, hay que tocar el mazo (más peligros o hallazgos más bajos).
- **La cuenta de lo guardado.** El balance de cada noche permite reconstruir los baúles con
  buena memoria. Se eligió así porque el balance es lo que se comenta; si mata la sorpresa
  del final, se muestra solo ganó/perdió sin números.
