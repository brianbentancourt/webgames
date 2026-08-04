# 03 · Reglas de resolución

Cómo se cuenta una noche. Es el corazón del motor y lo único que no puede tener
ambigüedad.

> **Los números de acá están sin calibrar.** Son los valores de arranque que están
> en `juegos/salvese/core/src/config.ts` para que el motor corra, no verdades de diseño.
> Se ajustan jugando. Lo que no se cambia sin pasar por `decisiones.md` son las
> formas: cinco noches, tres decisiones, tres minutos de discusión.

## Las tres decisiones

Cada jugador bloquea una **boleta** con las tres: ruta, raciones y esfuerzo. No hay
votación por separado ni turnos: se discute en voz alta y cada uno bloquea lo suyo
en secreto.

### Ruta

Se eligen 2 o 3 tramos candidatos del tablero por noche (3 desde la noche 2; en la
noche 1 son 2, para que la primera decisión sea binaria y no haya que explicar nada).
Cada tramo tiene `dureza`, `costoRecurso` y `hallazgo` ocultos, y una `pista`
pública de dos palabras.

### Raciones

Tres niveles. El consumo es **por viajero**:

| Nivel | Consumo por viajero | Efecto en vigor al cerrar |
|---|---|---|
| `ajustado` | 1 | −1 a todos |
| `normal` | 2 | 0 |
| `abundante` | 3 | +1 a todos |

### Esfuerzo

A quiénes se manda al trabajo pesado. Máximo 3 viajeros. Cada uno suma 1 legua de
avance y paga 1 de vigor. Un viajero en vigor 0 no puede ser asignado; si igual lo
mandan, se ignora y queda en la crónica.

## Conteo de boletas

Cada dimensión se cuenta **por separado**. Que la mesa se parta en la ruta no
arrastra la decisión de raciones, y eso produce noches donde el grupo eligió el
atajo *y* comió poco sin que nadie lo haya propuesto junto. Ese descalce es
deliberado: es de dónde salen las anécdotas.

1. **Mayoría simple** por dimensión.
2. **Empate** → decide el Capataz (`via: 'desempate_capataz'`). Es el rol que tiene
   poder y no información.
3. **Empate sin Capataz en la mesa** (2 jugadores) → decide el `Rng` de la semilla.
4. **Noche 5** → el Capataz decide solo, salvo que **todos** los demás hayan
   bloqueado lo mismo y distinto a él (`via: 'oposicion_unanime'`). Cambia la
   estructura social de la mesa, no los números.

### Boleta ausente

Si vence la ventana y alguien no bloqueó —se le trabó el celular, se fue a la
cocina, se desconectó— el motor completa por él:

- **Ruta y raciones**: lo que haya elegido parcialmente; si no eligió nada, la
  opción mayoritaria del resto. Nunca se abstiene: un voto menos cambia mayorías y
  el ausente terminaría decidiendo por omisión.
- **Esfuerzo**: lista vacía. Mandar gente al trabajo pesado es lo único que puede
  quebrar a un viajero, y no se hace en nombre de alguien que no está.

La `via` de esa noche queda en `'vencio_el_tiempo'` y la crónica lo menciona.

## Orden de resolución

Estricto y sin excepciones. Todo lo que consume azar lo hace del `Rng` de la
semilla, en este orden, para que la partida sea reproducible:

1. **Se fija la ruta.** Se lee `dureza`, `costoRecurso`, `hallazgo` del tramo.
2. **Avance** = `base (2) + esfuerzo × 1 − dureza`, mínimo 0.
   `avance += resultado`.
3. **Consumo** = `viajeros × consumoPorViajero[raciones] + costoRecurso`, mínimo 0.
   `recurso = max(0, recurso − consumo)`.
4. **Vigor por esfuerzo**: −1 a cada asignado.
5. **Vigor por raciones**: el efecto de la tabla, a todos.
6. **Hambre**: si el consumo no se pudo pagar entero (`recurso` llegó a 0), −1 más
   a todos. Es acumulativo con lo anterior: la noche que se acaba la comida duele.
7. **Objetos**: se aplican los efectos de los que estén activos, en orden de
   adquisición.
8. **Hallazgo**: `rng.suerte(tramo.hallazgo)` y, si sale, se saca un arquetipo del
   mazo del tablero. Si ya hay 4 objetos activos, no sale nada.
9. **Degradación**: `usosRestantes--` en todos los objetos activos; los que llegan a
   0 se caen.
10. **El perro** (ver abajo).
11. **El trato**, si corresponde esta noche.
12. **Final**: se evalúa si Sálvese quien pueda! terminó.

## El perro

No obedece: avisa (`D10`). Cada noche, después de resolver:

1. El motor mira el tramo **más duro** de los candidatos de la noche siguiente.
2. Calcula la alerta que correspondería: `ninguna`, `inquieto`, `grune`, `no_avanza`.
3. `rng.suerte(0.2)` → si sale, **miente**: muestra otra alerta al azar y
   `dice_la_verdad = false`.

Es el único dato público del juego. Que mienta 1 de cada 5 veces es lo que lo
convierte de oráculo en discusión: nadie puede tratarlo como verdad y nadie puede
ignorarlo.

Se lo puede perder si lo mandan a explorar (acción disponible desde la noche 3).
`presente = false` es permanente y la crónica final lo nombra igual.

## El trato

Una vez por travesía, o ninguna (`D9`). Entre las noches 2 y 4:

1. Si ya se ofreció, no se ofrece más.
2. `rng.suerte(0.25)` → esta travesía no se ofrece a nadie. **Que "ninguno" sea
   posible es lo que hace que la sospecha salga gratis.**
3. Si no, el motor elige al jugador cuyo objetivo personal esté **más lejos** de
   cumplirse. La oferta le acerca su objetivo y tiene un costo grupal diferido que
   se cobra en la última noche.

Nunca hace perder a nadie: cambia el final y la crónica, no el resultado.

## Ceguera por noche

En las noches 3 y 4, el camino ciega a un rol distinto: su `revelacion` llega vacía
y el celular lo dice sin dramatismo (*"esta noche no ves nada"*). El rol cegado se
elige del `Rng` entre los que están en la mesa, sin repetir. Aprenden a jugar sin
su mejor pieza.

## Fin de Sálvese quien pueda!

| Condición | Desenlace |
|---|---|
| `avance ≥ distanciaTotal` | Llegaron. Se pasa a `epilogo` |
| Se jugó la última noche sin llegar | No llegaron. Se pasa a `epilogo` igual |
| `recurso = 0` y todos en vigor 0 | Final abrupto. `epilogo` |

Los **objetivos personales** se evalúan recién en el epílogo, todos juntos, contra
`condicion` de cada uno. La revelación reinterpreta la partida entera y ese es el
punto: mientras se juega, nadie sabe para qué juega el otro.
