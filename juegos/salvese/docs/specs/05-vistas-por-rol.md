# 05 · Vistas por rol

Referencia: `juegos/salvese/core/src/vistas.ts`.

Proyectar es el único lugar donde se decide qué se oculta. Se hace en el servidor,
al momento de mandar, y no hay ninguna otra ruta por la que un dato secreto pueda
llegar a un cliente.

```
EstadoPartida ──proyectarTV()──────→ VistaTV       (todo público)
              └─proyectarJugador(id)→ VistaJugador (una por jugador, distintas)
```

## Qué ve cada rol

Cada rol recibe **una** revelación por noche. La habilidad no sirve sola: ninguna
alcanza para decidir, y por eso hay que hablar (`diseno.md` § Pilares).

| Rol | Ve | No ve | Forma de la revelación |
|---|---|---|---|
| **Baqueano** | El terreno de **una** ruta, elegida por el motor | El estado de la gente | `{ tipo: 'terreno' }` — texto del tramo, sin números |
| **Curandera** | El estado real de cada viajero | Cuántas noches faltan | `{ tipo: 'gente' }` — una frase por persona, sin números |
| **Despensero** | El inventario exacto | Quién aguanta el hambre | `{ tipo: 'inventario' }` — el único rol que ve cifras |
| **Memorioso** | El registro de travesías previas | El presente | `{ tipo: 'registro' }` — a veces falso, y no sabe cuándo |
| **Capataz** | Nada | Nada | `{ tipo: 'mando' }` — tiene poder, no información |
| **Pasajero** | Nada | — | ninguna. Tiene voto y objetivo propio |

El Capataz no tiene revelación de información, pero sí una **acción** que no es del
resto: `repartir_esfuerzo`. Todas las noches (no solo en empates y en la noche 5)
nombra hasta 3 viajeros para el trabajo pesado, con el comando `asignar_esfuerzo`
(D19). Es independiente de la boleta y del resto de las acciones, y **no se ofrece
en la noche 1** (D8: se decide una sola cosa). Si no hay Capataz en la mesa (2 y 3
jugadores), esa misma acción se le ofrece a **cada** jugador en `modo: 'voluntario'`,
con una sola opción: él mismo, y `max: 1`.

La acción lleva además `yaReparti` y `yaAsignado`, que es lo que hace que el
reparto sobreviva a recargar el celular sin estado local (D4). `yaAsignado` está
proyectado como todo lo demás: el Capataz ve la lista entera —es su propia
decisión— y en modo voluntario cada uno ve **solo si está él**, porque que otro se
haya ofrecido es secreto hasta el fogón igual que la boleta (I7).

El Capataz también es el único que puede recibir `mandar_perro` (A2, D10): desde
la noche 3 y sólo si `perro.presente`. Sin Capataz en la mesa, esta acción no
existe para nadie — a diferencia de `repartir_esfuerzo`, acá no hay modo
voluntario. Trae `yaMandado` por el mismo motivo que `repartir_esfuerzo` trae
`yaReparti`: que sobreviva a recargar el celular. A diferencia del esfuerzo, "no
lo mando" no es una lista vacía que haya que registrar en el servidor — es
simplemente no mandar el comando, así que el celular lo trata como una decisión
local (ver `09-cliente-control.md`).

Si el perro volvió de explorar la noche anterior, `VistaJugador.perroTramoRevelado`
trae el tramo más duro de esa noche — el mismo dato que `VistaTV.perro.tramoRevelado`,
porque es público, no un secreto de rol.

El Despensero es el único que ve números y eso es a propósito: es el contrapeso
exacto de la Curandera. Uno puede dictar una cifra en voz alta y que le crean o no;
la otra no tiene cifra que dictar. Esa asimetría es lo que hace que las dos
habilidades se necesiten.

## Por qué la Curandera no ve números

Es el freno contra el jugador alfa, que es lo que mata a los coop conversacionales
(`diseno.md` § Riesgos). Si la habilidad devolviera `{ Vale: 1, Nico: 3 }`, el alfa
pide los datos, los procesa y decide por todos.

Devolviendo *"Vale viene arrastrando la pierna"* la información **no es transferible
con precisión**: hay que interpretarla y comunicarla, y en el camino aparece la
discusión. Sumado a que las boletas se bloquean en secreto, **el alfa puede mandar
pero no puede verificar que le hicieron caso.**

Vale para todo lo que se agregue después: si una habilidad nueva devuelve un número
que se puede dictar en voz alta, está mal diseñada.

## La línea

En la noche 1 el celular **no ofrece opciones**: dicta qué decir en voz alta (`D8`).

```
"Decí en voz alta que la ruta de la izquierda tiene agua pero es más larga."
```

Cuando `linea` viene, va en lugar de `acciones`. Es el tutorial encubierto: nadie
lee reglas nunca, y aprenden qué hace su rol usándolo. Las habilidades se abren de a
una hasta la noche 3 (`FICHAS[rol].desbloqueo`).

## Cegado

En las noches 3 y 4, un rol distinto queda ciego cada noche. `revelacion` llega
`undefined` y el celular lo dice sin dramatismo. La TV **no muestra** quién está
cegado: enterarse de que el Baqueano no vio nada tiene que costar una pregunta.

## Reglas de proyección

1. **Un secreto no sale nunca**, ni siquiera al dueño, si todavía no le toca. El
   objetivo personal se manda recién en el epílogo, aunque el jugador ya lo conozca
   desde el reparto: si está en el JSON, está a un inspector de distancia del resto.
   En `epilogo`, `VistaJugador.miDesenlace` trae el objetivo del propio jugador
   —texto y si lo cumplió— y **nada** del resto: el objetivo ajeno sigue siendo de
   la TV, que ya lo manda entero en `VistaTV.desenlace.objetivos` (A3).
2. **Los números salen convertidos.** `vigor` sale como `aspecto` con
   `aspectoDeVigor()`, que es el único lugar donde se hace esa conversión.
3. **Las boletas ajenas no salen mientras se juega.** Sólo si un jugador bloqueó o
   no, y lo mismo para `esfuerzoAsignado`: recién se sabe quién votó qué y a quién
   se mandó al esfuerzo cuando `ultimaRevelacion` llega a la TV en el fogón (D18).
4. **`acciones` vacío es información**: significa "no te toca, hablá". El celular
   apagado es una pantalla válida y buscada.
5. **Una vista, un jugador.** Nunca se manda la misma `VistaJugador` a dos sockets,
   ni siquiera a los dos de una pareja: acuerdan hablando, no compartiendo pantalla.

## Parejas

Con 6 a 10 jugadores los roles se juegan de a dos. Los dos asientos reciben la
**misma revelación** pero vistas separadas, y cada uno bloquea su propia boleta.
Pueden discrepar, y que discrepen es el punto: la pareja acuerda entre sí antes de
hablarle al grupo, y ese acuerdo es una conversación más.

## La TV

`VistaTV` es todo público por definición. Se mira de reojo: sin números salvo el
reloj de los últimos 30 segundos, sin nada que haya que leer para entender.

Los `gatillos` son la única forma en que la TV se entera de que tiene que animar.
El cliente nunca decide solo (`D4`): si comparara estados para detectar cambios,
una reconexión dispararía la cutscene de una noche que ya pasó.

## La revelación del fogón

`VistaTV.revelacion` es la única excepción a "todo público por definición": es
secreta mientras se juega y pública recién después (D18). `proyectarTV()` la
incluye **únicamente** si `fase` es `fogon` o `epilogo`; en cualquier otra fase el
campo no sale, aunque el estado ya tenga `ultimaRevelacion` calculado. Si esto se
filtrara durante `decidir`, cualquiera que mire la TV rompe el juego de información
oculta: leería quién va a votar qué antes de que se cierre la boleta de nadie.

`proyectarJugador()` no expone `ultimaRevelacion` en ningún momento: es una vista
de la TV, no del celular.
