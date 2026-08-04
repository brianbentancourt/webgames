# 06 · Tableros

Referencia: `juegos/salvese/tableros/src/schema.ts`.

Un tablero es un **paquete de datos**, no una pantalla nueva. El motor no sabe que
existe La Sierra: lee `Tablero` y opera.

## La regla que sostiene el sistema

**Cada tablero cambia una regla, no solo la piel** (`D12`). Si son cuatro paisajes
con el mismo juego adentro, el grupo los prueba todos en una noche y no vuelve.

Por eso `regla` es obligatorio en el schema y es una frase, no un booleano: si al
escribir un tablero nuevo no podés completar *"este tablero rompe que…"*, el
tablero no está listo.

| Tablero | Noches | Qué rompe | Estado |
|---|---|---|---|
| La Sierra | 5 | El base. Raciones y frío | ✅ en el repo |
| El Salitral | 5 | El recurso es agua y se viaja de noche: el Baqueano casi no ve, el Memorioso pasa a ser el rol fuerte | ✅ en el repo |
| La Ciénaga | 7 | La carga pesa doble y los objetos se arruinan al doble. Todo el juego es qué dejar tirado | pendiente |
| La Crecida | 3 | Sin descanso. La versión corta para cuando ya comieron | pendiente |

**Para el MVP van dos.** Uno solo no obliga a abstraer bien y terminás con el
tablero hardcodeado sin darte cuenta. Ya pasó en este repo: el schema no permitía
que un tramo *repusiera* recurso (`costoRecurso ≥ -1`) porque en La Sierra ningún
tramo lo hace. Lo encontró El Salitral, que necesita la aguada para existir.

## Qué lleva adentro

| Campo | Para qué |
|---|---|
| `noches`, `distancia` | La forma de Sálvese quien pueda! |
| `recursoCritico` | Siempre uno solo: raciones, agua, lo que sea. Nunca dos |
| `regla` | Una frase: qué rompe respecto de La Sierra |
| `paleta`, `cerros` | La dirección de arte. Siluetas planas, teatro de sombras |
| `tramos` | Mínimo 6, para que 5 noches × 3 candidatos no repita demasiado |
| `mazoObjetos` | Arquetipos con efecto mecánico duro |
| `objetivos` | Mínimo 5. Uno por jugador, secretos, con `condicion` evaluable |
| `vozDelCamino` | El registro del relato que se le pasa al modelo |
| `fondos` | Nombres de la librería propia. Nada de generar imágenes en vivo |
| `respaldos` | Texto por escena para cuando el modelo no llega (`D6`) |

### Sobre `condicion`

Hoy es texto (`"recurso final >= 5"`) y lo evalúa el motor con un `switch` sobre el
`id` del objetivo. **No es un mini-lenguaje y no debería serlo**: son cinco o seis
condiciones por tablero y un DSL para eso es un intérprete que mantener a cambio de
nada.

### Sobre `efecto` de los objetos

Igual: texto descriptivo, el efecto real lo aplica el motor por `id`. El modelo
elige del mazo y escribe la piel, **nunca inventa el efecto** (`D5`).

Y los objetos no se recogen, se reparten (`D11`): sólo una persona puede cargarlo,
así que encontrar algo es automáticamente una discusión de dos minutos sobre quién.

## Agregar un tablero

1. Un archivo nuevo en `juegos/salvese/tableros/src/`.
2. Sumarlo a `TABLEROS` en `index.ts`.
3. `pnpm test` — `validarTableros()` corre contra el schema.

Nada más. Si hiciera falta tocar el motor para que un tablero funcione, el motor
está mal abstraído y eso se arregla antes de mergear el tablero.

### Checklist

- [ ] `regla` completa la frase *"este tablero rompe que…"*
- [ ] El recurso crítico es **uno** y tiene nombre propio en la ficción
- [ ] Al menos un tramo repone recurso, y cuesta algo llegar
- [ ] Los `pista` son de dos palabras y no tienen números: se miran de reojo
- [ ] Los `terreno` no tienen números tampoco: la habilidad no es transferible con precisión ([05](05-vistas-por-rol.md))
- [ ] El mazo tiene al menos un `redistribuye` y un `de_bolsillo`
- [ ] Los objetivos rozan entre sí y al menos dos se estorban
- [ ] `vozDelCamino` dice **cómo** se escribe, no de qué se habla
- [ ] Los respaldos se pueden leer solos sin que se note que son de respaldo

## Votar el tablero

Se vota desde los celulares antes de empezar: una conversación más antes de la
partida. El primero viene abierto y el resto se desbloquea al terminar una travesía.
