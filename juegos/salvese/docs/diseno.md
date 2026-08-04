# Sálvese quien pueda! — Diseño

## Pilares

1. **Se habla.** El juego pasa en la mesa, no en las pantallas.
2. **Nadie decide solo.** Ninguna habilidad sirve con la información propia.
3. **Toda decisión duele contra una persona**, no contra una opción abstracta.
4. **La partida deja una anécdota.** Ese es el producto real.

---

## Loop de una noche (~4 min)

```
ACAMPAR  →  DECIDIR  →  RESOLVER  →  FOGÓN
 (info)     (3 min)     (7 seg)     (30 seg)
```

- **Acampar** — cada celular recibe lo suyo. La TV muestra el estado del grupo.
- **Decidir** — tres decisiones: ruta, raciones, esfuerzo. Se discute en voz alta y se
  bloquea en secreto. **La fogata es el reloj**: se consume durante la ventana y la luz
  sobre los viajeros baja con ella. Los dígitos aparecen solo en los últimos 30 segundos.
- **Resolver** — única cutscene de la noche. La caravana avanza y el camino cuenta qué pasó.
- **Fogón** — el camino hace una pregunta incómoda sobre lo que acaban de hacer.
  No es un chiste del juego: le pasa el micrófono al grupo.

---

## Roles

Nombre lindo en la TV, nombre plano en el celular. Nadie tiene que aprender vocabulario.

| Rol | En el celu | Ve | No ve |
|---|---|---|---|
| Baqueano | el que ve el camino | el terreno de **una** ruta por noche | el estado de la gente |
| Curandera | la que ve a la gente | el estado real de cada viajero | cuántos días faltan |
| Despensero | el que cuenta la comida | el inventario exacto | quién aguanta el hambre |
| Memorioso | el que se acuerda | el registro de travesías previas (a veces falso) | el presente |
| Capataz | el que manda | nada | nada — tiene poder, no información |

**Combos**: las jugadas fuertes exigen dos personas sincronizadas en la misma ventana.
Eso no se coordina con un botón, se coordina hablando.

**Objetivos personales**: cada uno lleva uno, secreto, revelado solo al final. Nadie es
traidor — hay gente con prioridades distintas. La revelación reinterpreta la partida entera.

---

## Escalado 2 → 10

| Jugadores | Cómo |
|---|---|
| 2 | La IA ocupa dos sillas y las actúa con opinión propia. Discute, insiste, se equivoca. |
| 3 | Se fusiona Capataz en Memorioso. |
| 4–5 | Un rol por persona. **Punto óptimo: 5.** |
| 6–8 | Los roles se juegan **de a dos**: la pareja acuerda entre sí antes de hablarle al grupo. |
| 9–10 | Parejas + **pasajeros**: sin habilidad, con voto y objetivo propio. Son el pueblo. |

El límite no es técnico, es de aire para hablar. Nadie espera turno en ninguna configuración.

---

## Curva de 5 noches

- **1–2** — tiempo de sobra. Tutorial encubierto: el celular no da opciones, da **tu línea**
  (*"decí en voz alta que la ruta de la izquierda tiene agua pero es más larga"*).
  Las habilidades se abren de a una.
- **3–4** — el fuego se consume más rápido y cada noche el camino **ciega a un rol distinto**.
  Aprenden a jugar sin su mejor pieza.
- **5** — se acaba la votación. El Capataz decide solo, salvo que los demás se opongan
  **todos juntos**. Cambia la estructura social de la mesa, no los números.

---

## El trato

Una vez por travesía —no todas las noches— el camino le hace una oferta privada a **un**
jugador. O a ninguno; lo decide el motor según cómo viene la partida.

Aceptar da algo que sirve para el objetivo personal, con un costo grupal diferido.
**No sos un traidor, sos alguien que aceptó ayuda.** Nunca hace perder a nadie: cambia el
final y la crónica, no el resultado.

La paranoia sale gratis porque "ninguno" siempre es posible.

---

## Objetos

**No se recogen: se reparten.** Solo una persona puede cargarlo, así que encontrar algo
es automáticamente una discusión de dos minutos sobre quién.

| Tipo | Qué hace |
|---|---|
| Redistribuye información | Da a quien lo carga una porción de lo que ve otro rol. El más valioso. |
| No identificado | Nadie tiene el cuadro completo. Usarlo a ciegas es la apuesta. |
| Pesa | Ocupa capacidad que era de las raciones. El costo tiene nombre propio. |
| Daño diferido | Parecía bueno en la noche 2, se cobra en la 5. |
| De bolsillo | Quien lo encuentra decide si lo declara. Un instante privado por partida. |

**Límites**: máximo 3–4 objetos activos, y todos se degradan. Sin costo de guardar, todo
grupo acumula y muere con el inventario lleno.

Los objetos salen de un **mazo de arquetipos con efectos mecánicos duros**. El LLM elige del
mazo y escribe la piel — nunca inventa el efecto.

---

## El perro

No obedece: **avisa**. No lo controla nadie. Se para, mira, gruñe, no quiere avanzar.

- Es el único dato **público** en un juego donde todo lo demás es privado. Cambia la forma
  de la conversación: hay algo en el medio que todos interpretan distinto.
- **Miente una de cada cinco veces.** Con eso deja de ser oráculo y pasa a ser discusión.
- **Se lo puede perder** si lo mandan a explorar. Es la única decisión que duele sin ser
  contra un jugador.
- La crónica final lo nombra, haya llegado o no.

En la escena es el segundo foco de vida: duerme junto al fuego, se levanta cuando algo viene.

---

## Eventos especiales

- **El silencio** — una noche por travesía sin poder hablar. Solo se bloquea en el celu.
  Va en contra de todo el diseño y por eso funciona: entienden cuánto valía poder hablar.
- **El que se suma** — alguien pide entrar a la caravana. Come raciones, aporta una habilidad,
  no sabés si conviene. Se vota en voz alta, delante de él.
- **El clima como información** — si el cielo se pone verdoso, algo viene. Se aprende a leer
  sin que nadie lo explique.

---

## Tableros

Un tablero es un **paquete de datos**, no una pantalla nueva:

```js
{
  id, nombre, noches,
  paleta,            // cielo, tres profundidades de cerro, brasa
  cerros,            // siluetas
  tramos,            // nombres de los pasos
  recursoCritico,    // "raciones" | "agua" | ...
  mazoObjetos,
  vozDelCamino       // registro del relato
}
```

**Cada tablero cambia una regla, no solo la piel.** Si son cuatro paisajes con el mismo juego
adentro, el grupo los prueba todos en una noche y no vuelve.

| Tablero | Noches | Qué rompe |
|---|---|---|
| La Sierra | 5 | El base. Raciones y frío. |
| El Salitral | 5 | El recurso es agua y se viaja de noche: el Baqueano casi no ve, el Memorioso pasa a ser el rol fuerte. |
| La Ciénaga | 7 | La carga pesa doble y los objetos se arruinan al doble. Todo el juego es qué dejar tirado. |
| La Crecida | 3 | Sin descanso. La versión corta para cuando ya comieron. |

Se vota el tablero desde los celulares: una conversación más antes de empezar. El primero
viene abierto, el resto se desbloquea al terminar una travesía.

**Para el MVP: dos tableros.** Uno solo no obliga a abstraer bien y terminás con el tablero
hardcodeado.

---

## Presentación en TV

Se mira **de reojo, no se lee**. Diseñado para 3 metros: tipografía mínima ~3% del alto,
contraste alto, 5% de margen por overscan, cero hover, cero scroll, todo en una pantalla.

Dirección de arte: **siluetas planas, teatro de sombras**, paleta de noche en capas (cerro
lejano más claro por perspectiva atmosférica, cercano casi negro). Brasa como único cálido.

Tres niveles de animación y nada más:

- **Ambiente** — fuego, brasas, estrellas. Permanente y bajo.
- **Resolución** — 7 segundos, una vez por noche. Es el respiro del ritmo y el momento en que
  los cinco se callan y miran juntos. Todo lo dramático se guarda para acá.
- **Alerta** — 1–2 segundos. Apareció un objeto, alguien se quebró.

El movimiento sincroniza al grupo. Si la pantalla se mueve todo el tiempo, se pierde esa
herramienta.

**Imágenes**: librería propia de fondos, el modelo elige cuál y con qué tinte. Nada de
generación en el camino crítico — latencia impredecible y deriva de estilo entre noches.

---

## Riesgos conocidos

**El jugador alfa.** Es lo que mata a los coop conversacionales (Pandemic sufre exactamente
eso). Freno de diseño: la información oculta **no es transferible con precisión** —la Curandera
ve estados, no números que pueda dictar— y las decisiones se bloquean en secreto, así que el
alfa puede mandar pero no puede verificar que le hicieron caso.

**La barrera de entrada.** Cinco roles asimétricos es mucho para las once de la noche. Por eso
la noche 1 decide una sola cosa y el celular da la línea hecha. Si al minuto no están jugando,
no hay juego.

**Le falta risa.** El diseño es seco y elegante; los party games viven de la carcajada. Válvulas:
el fogón, los apodos que el camino le pone a cada uno después de la noche 2, y un relato
deadpan en vez de solemne.
