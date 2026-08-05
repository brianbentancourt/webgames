# Lo que falta

Secuencia de lo que queda después de la fase 1 de
[`plan-diversion.md`](plan-diversion.md). Las cirugías 3, 4 y 5 ya están
especificadas ahí; esto dice **en qué orden** y qué hacer con lo que no tiene
spec en ninguna parte.

La regla que ordena todo: **el playtest con gente es una compuerta, no una
tarea.** Nada de la cirugía 3 en adelante arranca antes de pasarla. Este repo ya
construyó dos veces antes de validar (la TV antes de saber si la noche era
interesante, la cañería antes de saber si el fogón decía algo) y las dos veces lo
pagó.

---

## Fase A — Lo que falta para que el playtest mida el juego, no una maqueta

**Antes de sentar a nadie.** No es pulido: son dos piezas que el diseño declara
centrales y que hoy no existen. Medir sin ellas es medir otro juego.

### A1 · El perro tiene que decir algo

`D10` lo llama **"el único dato público del juego"** y `diseno.md` dice que es
*"el segundo foco de vida"* de la escena. Hoy las cuatro alertas
—`ninguna`, `inquieto`, `grune`, `no_avanza`— se pintan **exactamente igual**.
El motor las calcula bien, miente 1 de cada 5 veces como corresponde, y la
información muere antes de llegar a la mesa.

Es la mecánica entera sin transmitir aquello para lo que existe. Y no es un
problema de arte final: es que el juego promete un objeto público que todos
interpretan distinto, y no hay nada que interpretar.

Cuatro tratamientos, **postura y tinte, cero texto** (se mira de reojo a 3
metros):

| Alerta | Cómo se lee |
|---|---|
| `ninguna` | echado junto al fuego |
| `inquieto` | parado, orejas arriba, mirando al grupo |
| `grune` | parado, girado hacia afuera, tinte brasa |
| `no_avanza` | plantado, patas firmes, tinte brasa fuerte |

`Caravana.tsx` ya recibe `vista.perro.alerta`: es marcado y CSS, más una pasada
de diseño chica. No necesita nada del motor.

**Criterio**: alguien en la mesa dice *"¿qué le pasa al perro?"* sin que se lo
preguntes. Si nadie lo mira, la diferencia visual es muy sutil.

### A2 · El perro tiene que poder perderse

`D10` dice **"se lo puede perder"** y
[03 · Reglas](specs/03-reglas-de-resolucion.md) dice *"si lo mandan a explorar
(acción disponible desde la noche 3)"*. **No está implementado.** Lo único que
hay es esto, en `maquina.ts`:

```ts
if (decisionEsfuerzo.includes('perro' as any)) { perroPresente = false; }
```

Inalcanzable: el perro nunca está entre las opciones de esfuerzo. La rama es
código muerto y `presente` no puede valer `false` nunca.

Es la peor clase de deuda que tiene el repo: **una decisión documentada, con su
justificación escrita, que el código no cumple.** Y no es menor para el
playtest, porque `diseno.md` la llama *"la única decisión que duele sin ser
contra un jugador"* — o sea que es la única de su tipo en todo el juego.

**Decisiones que hay que tomar antes de escribirla** (no las invento acá):

1. **Quién manda al perro.** D10 dice *"nadie lo controla"*, así que no puede ser
   una habilidad. Con D19 ya establecido, lo natural es el Capataz —es el que
   decide lo que duele— pero también podría ser la única cosa que se vota, para
   que no todo el peso caiga en un rol.
2. **Qué da explorar.** Tiene que valer la pena o nadie lo arriesga: lo más
   coherente es que devuelva información *cierta* sobre los tramos de la noche
   siguiente, que es justo lo que el perro miente cuando se queda.
3. **Con qué probabilidad se pierde.** Si es muy baja, se manda siempre y no
   duele; si es muy alta, no se manda nunca y la mecánica no existe.

**Criterio**: en una partida alguien propone mandarlo y otro se opone. Si nadie
lo discute, o no da nada o el riesgo no se entiende.

### A3 · El celular tiene que revelar lo tuyo

Marcado en M3.5 y sigue abierto. Veinticinco minutos sosteniendo el teléfono, y
el pago —tu objetivo secreto, cumplido o no— se ve **solo en la TV**; el celular
repite el mismo *"no te toca ninguna acción"* genérico que usó toda la partida.

Rompe los pilares 2 y 3: la persona que más le prestó atención a su rol es la que
menos se entera de cómo terminó. Y para la pregunta que importa —¿quieren jugar
otra?— el momento del pago es exactamente donde se decide.

`VistaJugador` suma el objetivo propio (texto + cumplido) en fase `epilogo`, y
`JuegoControl.tsx` una pantalla que lo muestre. Es chico y toca el final, que es
lo que la gente se lleva.

---

## Fase B — El playtest. La compuerta.

Cinco personas, una travesía entera, TV y celulares reales. **No lo corras vos
solo con bots.**

Las tres preguntas, y no son de opinión:

1. ¿Alguien **acusó a alguien** en voz alta cuando se revelaron las boletas?
2. ¿Alguien se rió?
3. Al terminar, ¿la mesa **contó qué pasó** en alguna noche sin que se lo pidieras?

| Resultado | Qué significa |
|---|---|
| Las tres que sí | La fase 1 cumplió. Se abre la fase D |
| Solo la 1 | El mecanismo anda pero está seco. Revisar **cómo se presenta** la revelación antes de apilar nada |
| Ninguna | El problema es más profundo que las cinco cirugías. **Volver al diseño**, no seguir |

Ese tercer caso es real y hay que poder decirlo. Es el M1 que nunca se cerró.

---

## Fase C — La limpieza. Independiente, para los huecos.

Nada de esto depende del playtest, así que entra cuando haya tiempo muerto. Va
junto porque es todo el mismo síntoma: **cosas que se declararon y nunca se
conectaron.** Aparecieron todas en menos de una semana de trabajo, que es el dato
que importa más que cualquiera de ellas por separado.

| Qué | Estado | Salida |
|---|---|---|
| `FUSIONES` (`roles.ts`) | 0 usos. Y no podría usarse: `REPARTO[3]` no tiene ni memorioso ni capataz, así que la fusión que describe no aplica | Borrar, **y corregir `diseno.md`**, que promete esa fusión |
| Reparto en parejas 6–8 | `diseno.md` dice que los roles se juegan de a dos; `REPARTO[6]` solo duplica el baqueano, y el capataz no se duplica nunca | Decidir cuál manda y alinear el otro |
| `TRATO.probabilidadDeNoOfrecer` | 0 usos. `maquina.ts` hardcodea 0.25 / 0.33 / 0.5 aparte, que además es **otro diseño** (probabilidad creciente por noche) | Que el motor lea la config, que es la que coincide con D9 |
| `version_incompatible` | 0 emisiones. Ya documentado como deuda en [04 · Protocolo](specs/04-protocolo.md) | Borrar del `CodigoError` |
| `capacidad = 38` para la bordalesa | Número mágico en `maquina.ts` que asume la capacidad de un tablero | Derivarlo del tablero |
| `pnpm -r build` fuera de la rutina | El repo tuvo el bundle de la TV sin compilar durante horas con `typecheck` y `test` en verde | Correrlo antes de todo deploy |

**Descartado hacer esto primero.** Es trabajo satisfactorio, visible y que no
mueve la aguja de si el juego es divertido. Sirve porque estás bloqueado
esperando la compuerta, no en lugar de cruzarla: si el playtest sigue sin
aparecer, esta fase se convierte en procrastinación prolija.

---

## Fase D — Las cirugías 3, 4 y 5

Solo si la fase B da verde. Especificadas en
[`plan-diversion.md`](plan-diversion.md); acá va solo lo que cambia por haber
implementado la 1 y la 2.

| | Qué | Depende de |
|---|---|---|
| **3** | El reporte: mentir con la habilidad, 2 veces por travesía | Que la revelación del fogón haya funcionado — es el mismo mecanismo de rendición de cuentas |
| **4** | Los objetivos muerden: cuatro cuadrantes en el epílogo | A3 (el celular ya muestra el objetivo propio) |
| **5** | Umbrales en vez de sumas | Nada. Es la más cara y la que arregla el problema de fondo |

**El orden entre 3 y 4 se puede invertir**, y conviene si el playtest muestra que
la gente entendió la revelación pero no le importó lo que pasaba: eso es síntoma
de que no hay nada personal en juego, que es lo que arregla la 4.

**La 5 no se saltea.** Es la única que toca la aritmética de la decisión central,
que es el diagnóstico original: tres inputs discretos sumándose linealmente se
agotan en la segunda partida. Las otras cuatro cirugías hacen que la mesa hable;
la 5 es la que hace que valga la pena volver.

---

## Lo que sigue afuera

| Descartado | Por qué |
|---|---|
| Tableros 3 y 4 | Cuatro paisajes con un juego flojo adentro es cuatro veces el mismo problema |
| Arte final de la TV, Cast, deploy nativo | M5. Ya se construyó la cañería antes que la diversión una vez |
| Subir la mentira del perro del 20% | Con A1 y la cirugía 3 el perro deja de ser la única incertidumbre. Recalibrar después de medir, no antes |
| Sonido | No hay spec y no es MVP. Si se suma algo, un pulso al bloquear la boleta rinde más que un sistema entero |
