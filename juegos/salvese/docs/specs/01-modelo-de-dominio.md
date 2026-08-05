# 01 · Modelo de dominio

Referencia: `juegos/salvese/core/src/estado.ts`.

## La forma

```
EstadoPartida
├─ id, tablero, semilla
├─ fase, noche, nochesTotales
├─ avance / distanciaTotal        ← dónde va la caravana
├─ recurso / capacidad            ← raciones o agua, según el tablero
├─ viajeros[]                     ← rol, vigor, objetivo secreto, objeto
├─ perro                          ← lo único público en vivo; se lo puede perder (A2)
├─ objetos[]                      ← máximo 4 activos, todos se degradan
├─ nocheActual?                   ← candidatos, boletas, esfuerzo asignado, si el perro explora, vencimiento
├─ cronica[]                      ← una entrada por noche
├─ tratoOfrecidoA?
├─ esfuerzoNocheAnterior          ← quién fue anoche: no se repite (D19)
├─ ultimaRevelacion?              ← quién votó qué la última noche resuelta (D18)
└─ desenlace?                     ← se llena en el epílogo
```

Es un objeto plano y serializable. Nada de clases, nada de métodos, nada de
referencias circulares: el estado tiene que poder volcarse a JSON en cualquier
momento para debuggear una partida que salió mal.

## Qué es secreto y dónde

La información oculta es el juego. Estos campos **nunca** salen del servidor:

| Campo | Quién puede llegar a verlo |
|---|---|
| `viajero.objetivo` | Nadie hasta `epilogo`. Ahí, el propio dueño lo ve en `VistaJugador.miDesenlace` (A3); el de los demás sigue siendo de la TV (`VistaTV.desenlace`) |
| `viajero.vigor` (el número) | Nadie. Afuera sale como `aspecto` cualitativo |
| `viajero.aceptoElTrato` | El que aceptó, y recién en el epílogo |
| `tramo.dureza`, `costoRecurso`, `hallazgo` | El Baqueano, de **un** tramo, como texto |
| `nocheActual.boletas` | Nadie hasta que resuelve la noche |
| `nocheActual.esfuerzoAsignado` | Nadie hasta que resuelve la noche (D19: sigue el mismo desfasaje que la boleta). Excepción acotada: el Capataz ve **su propio** reparto en `repartir_esfuerzo.yaAsignado`, y en modo voluntario cada uno ve solo si está él |
| `nocheActual.esfuerzoRespondieron` | Cada jugador ve solo si él ya respondió (`yaReparti`). Existe aparte porque repartir "a nadie" y no haber repartido son los dos una lista vacía |
| `ultimaRevelacion` | **Todos**, pero recién en `fogon` y `epilogo` (D18) — antes es tan secreto como la boleta de la que sale |
| `perro.dice_la_verdad` | Nadie, nunca. Ni en el epílogo |
| `nocheActual.perroExplorando` | **Todos** — es una decisión que se dice en voz alta (A2), no un secreto |
| `nocheActual.perroDecidido` | El Capataz, como `yaDecidio`. Existe aparte porque "que se quede" y "todavía no contestó" dejan los dos `perroExplorando` sin tocar |
| `perro.tramoRevelado` | **Todos**, la noche siguiente a que el perro vuelva de explorar (A2). Tan público como `alerta` |
| `objeto.arquetipo` si no está identificado | Nadie |
| `semilla` | Nadie durante la partida |

**Las boletas son secretas *durante* la noche y públicas *después* (D18, D19).**
Es la única excepción al patrón "esto nunca sale del servidor": `resolverNoche()`
computa `RevelacionBoletas` —quién votó qué, con nombre, y a quién se mandó al
esfuerzo— y la guarda en `ultimaRevelacion`. `proyectarTV()` la expone únicamente
si `fase` es `fogon` o `epilogo`; en cualquier otra fase el campo no sale, ni
siquiera si ya existe en el estado. `proyectarJugador()` no la expone nunca.

La proyección está en [05 · Vistas por rol](05-vistas-por-rol.md). La regla que
sostiene todo esto: **si un cliente tuviera que decidir qué no mostrar, alcanzaría
con abrir el inspector para romper el juego.**

## Invariantes

Se chequean en los tests de propiedades ([11 · Testing](11-testing.md)). Si alguna
se rompe, es bug del motor, no jugada rara.

| # | Invariante |
|---|---|
| I1 | `0 ≤ vigor ≤ 3` para todo viajero |
| I2 | `recurso ≥ 0` y `recurso ≤ capacidad` |
| I3 | Un viajero carga como máximo un objeto (`D11`) |
| I4 | Como máximo 4 objetos activos en la partida (`D11`) |
| I5 | Todo objeto con `usosRestantes = 0` sale de `objetos[]` al cerrar la noche |
| I6 | La cantidad y los roles de `viajeros` coinciden con `REPARTO[n]` |
| I7 | `nocheActual.boletas` y `nocheActual.esfuerzoAsignado` sólo se llenan durante la fase `decidir`; `VistaTV.revelacion` sólo sale en `fogon` y `epilogo` |
| I8 | `cronica.length === noche` una vez cerrado el fogón de esa noche |
| I9 | `avance` nunca decrece |
| I10 | Todo azar salió del `Rng` de la semilla: `Math.random()` no aparece fuera de `rng.ts` |
| I11 | `tratoOfrecidoA` se escribe a lo sumo una vez por travesía (`D9`) |
| I12 | Ningún id de `esfuerzoNocheAnterior` puede aparecer en el `esfuerzoAsignado` de la noche siguiente (`D19`) |
| I13 | `perro.presente` es monótono: una vez `false`, no vuelve a `true` (`D10`, `A2`) |
| I14 | `nocheActual.perroExplorando` sólo puede ser `true` si `noche ≥ 3` y lo mandó el Capataz (`A2`) |
| I15 | `perroExplorando = true` implica `perroDecidido = true`. Al revés no: "que se quede" decide sin mandar (`A2`) |

## Por qué el vigor no viaja como número

La Curandera ve el estado real de cada viajero. Si eso llegara al celular como
`vigor: 1`, lo dicta en voz alta y se termina el juego: pasa de ser información
que hay que interpretar y comunicar a ser un dato que se lee.

Por eso la habilidad devuelve texto (`"anda arrastrando la pierna"`) y la vista
pública devuelve `aspecto` de cuatro valores. Es el mismo freno de diseño que
contiene al jugador alfa: **puede mandar, pero no puede verificar** (`diseno.md`
§ Riesgos).

## Identidad y reconexión

`JugadorId` es un UUID que vive lo que vive la partida. El celular guarda un
**token de sesión** aparte (`Asiento.sesion`) en `localStorage` y con eso vuelve a
su asiento.

Un jugador desconectado **no se va de la caravana**: sigue ocupando su rol, y si la
ventana de decisión vence sin su boleta, el motor la completa por él
([03 · Reglas](03-reglas-de-resolucion.md) § Boleta ausente). Sacarlo obligaría a
rebalancear el reparto en el medio de una noche, que es peor que un voto de más.

## Lo que el estado deliberadamente no guarda

- **Historial de vistas.** Se reproyecta cada vez. Es barato y evita que dos
  representaciones del mismo estado se desincronicen.
- **Chat.** No hay: la conversación es el juego y pasa en el aire (`D1`).
- **Cuentas de usuario.** Un nombre por partida y listo.
- **El texto que devolvió el modelo**, más allá de la crónica. Si hay que
  reconstruir la partida, se reconstruye de la semilla y los comandos.
