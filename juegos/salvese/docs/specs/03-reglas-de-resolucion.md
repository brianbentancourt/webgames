# 03 · Reglas de resolución

Cómo se cuenta una noche. Es el corazón del motor y lo único que no puede tener
ambigüedad.

> **Los números de acá están sin calibrar.** Son los valores de arranque que están
> en `juegos/salvese/core/src/config.ts` para que el motor corra, no verdades de diseño.
> Se ajustan jugando. Lo que no se cambia sin pasar por `decisiones.md` son las
> formas: cinco noches, tres decisiones, tres minutos de discusión.

## Dos decisiones más un reparto

Cada jugador bloquea una **boleta** con dos: ruta y raciones. No hay votación por
separado ni turnos: se discute en voz alta y cada uno bloquea lo suyo en secreto.

El esfuerzo **ya no está en la boleta** (D19): lo reparte el Capataz —o cada uno de
sí mismo si no hay Capataz en la mesa— con un comando aparte, `asignar_esfuerzo`,
independiente de bloquear la boleta. Ver más abajo, § El esfuerzo.

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

## Conteo de boletas

Ruta y raciones se cuentan **por separado**. Que la mesa se parta en la ruta no
arrastra la decisión de raciones, y eso produce noches donde el grupo eligió el
atajo *y* comió poco sin que nadie lo haya propuesto junto. Ese descalce es
deliberado: es de dónde salen las anécdotas.

1. **Mayoría simple** por dimensión.
2. **Empate** → decide el Capataz (`via: 'desempate_capataz'`). Es el rol que tiene
   poder y no información.
3. **Empate sin Capataz en la mesa** (2 y 3 jugadores) → decide el `Rng` de la
   semilla.
4. **Noche 5** → el Capataz decide solo, salvo que **todos** los demás hayan
   bloqueado lo mismo y distinto a él (`via: 'oposicion_unanime'`). Cambia la
   estructura social de la mesa, no los números.

### Boleta ausente

Si vence la ventana y alguien no bloqueó —se le trabó el celular, se fue a la
cocina, se desconectó— el motor completa por él:

- **Ruta y raciones**: lo que haya elegido parcialmente; si no eligió nada, la
  opción mayoritaria del resto. Nunca se abstiene: un voto menos cambia mayorías y
  el ausente terminaría decidiendo por omisión.

La `via` de esa noche queda en `'vencio_el_tiempo'` y la crónica lo menciona.

## El esfuerzo

**El Capataz no vota: reparte** (D19). Cada noche nombra hasta `AVANCE.esfuerzoMax`
(3) viajeros para el trabajo pesado, con el comando `asignar_esfuerzo`. Cada uno
suma 1 legua de avance y paga 1 de vigor.

- **No se puede mandar a la misma persona dos noches seguidas.** `esfuerzoNocheAnterior`
  en `EstadoPartida` es lo que hace esa regla cumplible sin releer la crónica.
- **Un viajero con vigor 0 no puede ser asignado.**
- **Sin Capataz en la mesa** (2 y 3 jugadores, ver `REPARTO`): el esfuerzo es
  **voluntario**. Cada uno declara si se ofrece a sí mismo con el mismo comando; no
  puede asignar a nadie más.
- **Independiente de la boleta**: asignar esfuerzo no depende de haber bloqueado
  ruta y raciones, ni al revés. El atajo de "resolver apenas todos bloquean" (ver
  abajo) respeta esto: no le roba la ventana al Capataz.
- **Si nadie asigna nada antes de que venza la ventana**, el esfuerzo de esa noche
  es lista vacía. Mismo criterio que la boleta ausente: mandar gente al trabajo
  pesado no se hace en nombre de alguien que no está.

### El atajo de "todos bloquearon"

Cuando todos bloquean su boleta antes de que venza el reloj, la noche se resuelve
al instante en vez de esperar el resto de la ventana — **salvo que haya Capataz en
la mesa y todavía no haya repartido el esfuerzo**: en ese caso se espera a que
reparta (aunque reparta una lista vacía) antes de resolver. Sin Capataz (esfuerzo
voluntario) alcanza con que todos hayan bloqueado la boleta.

**La noche 1 no espera a nadie**: no se reparte esfuerzo (D8), así que esperar al
Capataz sería esperar algo que no va a llegar nunca. Esa condición sale de
`hayRepartoDeEsfuerzo(noche)` en `config.ts`, que es el **mismo** helper que usa la
proyección para decidir si ofrece la acción. Tienen que estar de acuerdo por
construcción: cuando no lo estaban, la mesa bloqueaba en veinte segundos y se
quedaba mirando el teléfono los otros setenta hasta que vencía la ventana. Es
justo el minuto del que depende que la mesa se enganche.

## Las boletas se revelan en el fogón

Secretas **durante** la noche, públicas **después** (D18). Al resolver, el motor
computa una `RevelacionBoletas` —quién votó qué en ruta y raciones, con nombre, a
quiénes se mandó al esfuerzo y quién repartió— y la guarda en
`EstadoPartida.ultimaRevelacion`. La TV la muestra en el fogón. Ver
[01 · Modelo de dominio](01-modelo-de-dominio.md) § Qué es secreto y dónde.

## Orden de resolución

Estricto y sin excepciones. Todo lo que consume azar lo hace del `Rng` de la
semilla, en este orden, para que la partida sea reproducible:

1. **Se fija la ruta.** Se lee `dureza`, `costoRecurso`, `hallazgo` del tramo.
2. **Se fija el esfuerzo**: lo que repartió el Capataz (o lo que se ofrecieron),
   filtrado a quienes todavía tengan vigor y cortado a `AVANCE.esfuerzoMax`.
3. **Avance** = `base (2) + esfuerzo × 1 − dureza`, mínimo 0.
   `avance += resultado`.
4. **Consumo** = `viajeros × consumoPorViajero[raciones] + costoRecurso`, mínimo 0.
   `recurso = max(0, recurso − consumo)`.
5. **Vigor por esfuerzo**: −1 a cada asignado.
6. **Vigor por raciones**: el efecto de la tabla, a todos.
7. **Hambre**: si el consumo no se pudo pagar entero (`recurso` llegó a 0), −1 más
   a todos. Es acumulativo con lo anterior: la noche que se acaba la comida duele.
8. **Objetos**: se aplican los efectos de los que estén activos, en orden de
   adquisición.
9. **Hallazgo**: `rng.suerte(tramo.hallazgo)` y, si sale, se saca un arquetipo del
   mazo del tablero. Si ya hay 4 objetos activos, no sale nada.
10. **Degradación**: `usosRestantes--` en todos los objetos activos; los que llegan a
    0 se caen.
11. **El perro**: si lo mandaron a explorar, se sortea si vuelve (ver abajo). El
    efecto de volver —alerta sin mentira y tramo revelado— se aplica recién en la
    transición `fogon → acampar` de la noche siguiente, no acá.
12. **El trato**, si corresponde esta noche.
13. **Revelación de boletas**: se computa `RevelacionBoletas` y se guarda en
    `ultimaRevelacion` (ver arriba).
14. **Final**: se evalúa si Sálvese quien pueda! terminó.

## El perro

No obedece: avisa (`D10`). Cada noche, después de resolver:

1. El motor mira el tramo **más duro** de los candidatos de la noche siguiente.
2. Calcula la alerta que correspondería: `ninguna`, `inquieto`, `grune`, `no_avanza`.
3. `rng.suerte(PERRO_MIENTE)` (0.2) → si sale, **miente**: muestra otra alerta al
   azar y `dice_la_verdad = false`.

Es el único dato público del juego. Que mienta 1 de cada 5 veces es lo que lo
convierte de oráculo en discusión: nadie puede tratarlo como verdad y nadie puede
ignorarlo.

### Se lo puede perder

**Manda el Capataz.** D10 dice "nadie lo controla", y eso sigue valiendo para
todos menos para esta decisión: es la única que duele sin ser contra un jugador
(`diseno.md`), así que cae en quien reparte el dolor, no en un voto ni en un modo
voluntario. **Sin Capataz en la mesa** (2 y 3 jugadores, ver `REPARTO`) esta acción
no existe: esa partida no se puede mandar a explorar.

Comando `mandar_perro_a_explorar`, válido en fase `decidir`. Todas estas
condiciones tienen que cumplirse, o se rechaza con `jugada_invalida`:

- Lo manda el Capataz, nadie más.
- `estado.noche >= 3`.
- `perro.presente` (no se puede explorar con un perro que ya se perdió).
- No haber **contestado** ya esta misma noche (`nocheActual.perroDecidido`).

El comando lleva `manda: boolean`: **"que se quede" también se manda**. Deja
`perroDecidido = true` sin tocar `perroExplorando`, y con eso el celular sabe que
ya contestó aunque el estado del perro no haya cambiado. Sin ese registro, decir
que no y recargar el teléfono hace volver la pregunta a mitad de la noche
([09 · Cliente control](09-cliente-control.md) § Mandar al perro a explorar).

Una vez contestado no se cambia de idea en ningún sentido: retirarlo después de
haberlo mandado sería sacarlo del riesgo gratis.

Al resolver la noche (paso 10 del orden de abajo), si se lo mandó a explorar,
`rng.suerte(PERRO_EXPLORA_RIESGO)` (25%, `config.ts`) decide el resultado:

- **Se pierde**: `perro.presente = false`, permanente, y la crónica registra el
  hecho `perro_perdido`. La crónica final lo nombra igual.
- **Vuelve**: la crónica registra `perro_exploro`. Ese resultado se guarda para
  la noche siguiente (ver abajo): los candidatos de esa noche todavía no existen
  cuando resuelve la noche en la que se mandó, así que el efecto se aplica recién
  en la transición `fogon → acampar`.

**Qué da volver.** La noche siguiente el motor **saltea por completo** el sorteo
de `PERRO_MIENTE`: esa noche `dice_la_verdad` queda forzado a `true`. Además se
guarda en `perro.tramoRevelado` el nombre del tramo más duro entre los candidatos
de esa noche — público, igual que la alerta. Cambia mentira por riesgo: el perro
sigue siendo el único dato público del juego, pero por una noche es información
segura en vez de sospechosa. `tramoRevelado` solo dura esa noche: la transición
siguiente reconstruye `perro` entero y lo omite salvo que se haya vuelto a
explorar con éxito.

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
