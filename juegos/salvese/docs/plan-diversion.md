# Plan de diversión

Qué le falta a Sálvese quien pueda! para que un grupo quiera jugar una segunda
travesía. No es una lista de features: es una cirugía sobre por qué la mesa se
queda callada.

Lo que está acá **da vuelta cuatro cosas que ya estaban decididas**. Las entradas
nuevas de `decisiones.md` (D18 a D21) dicen cuáles y por qué.

---

## El diagnóstico, en una frase

> Es un juego que se vende como *"la conversación es el juego"* (D1) y en el que
> hablar no tiene ninguna consecuencia mecánica.

Cada pieza, por separado, le saca las estacas a la charla:

| Pieza | Cómo desactiva la conversación |
|---|---|
| La boleta es secreta **y nunca se revela** | Podés decir "voto por el paso" y votar el río. Nadie se entera nunca |
| Se resuelve por mayoría | La decisión no es de nadie. No hay a quién culpar |
| La info "no es transferible con precisión" | Pero tampoco es **falsificable**: decís lo que ves y nada registra si mentiste |
| El trato *"nunca hace perder a nadie"* (D9) | El único momento de divergencia real es cosmético |
| El objetivo secreto no obliga a nada durante la partida | Es un billete de lotería, no una tensión |

Tres minutos de discusión donde mentir es **gratis, indetectable e inútil a la
vez**. No le falta arte ni le falta modelo: le falta que las palabras pesen.

Todo lo que sigue sale de ahí. El orden es por impacto sobre costo.

---

## Cirugía 1 — Las boletas se revelan al resolver

**Hoy**: `boletas` es secreto durante la noche y después se descarta. Ni la TV ni
ningún celular muestran nunca quién votó qué.

**Cambio**: secretas **durante**, públicas **después**. En el fogón, la TV muestra
quién votó qué, con nombre, y cómo se resolvió.

```
LA RUTA       El Paso del Viento  ←  Ana · Beto · Dani
              La Vega                Caro · Emi
RACIONES      ajustado            ←  Beto · Caro · Dani · Emi
              abundante              Ana
```

Por qué es la primera:

- **Convierte cada frase dicha en un compromiso.** "Dale, vamos por el paso" se
  puede desmentir cuatro minutos después.
- **Crea culpables con nombre.** La anécdota (pilar 4) no sale de un modelo
  ingenioso: sale de que alguien pueda decir *"¡vos dijiste que ibas al río!"*.
- **Le da contenido al fogón**, que hoy es la pantalla muda que el propio playtest
  marcó como la peor falla (roadmap M3.5). La revelación **es** el fogón. Sin
  escribir una línea de contenido nuevo.
- Los datos ya están en el estado. Es una vista y nada más.

Con esto adentro, `fogonMs: 15_000` es poco: **30 segundos**, que además es lo que
`diseno.md` decía desde el principio.

**Descartado — mostrar las boletas en vivo mientras se decide.** Mata la tensión
de la ventana y convierte la discusión en un tablero de votación. El valor está en
el desfasaje: se habla a ciegas, se paga después.

---

## Cirugía 2 — El Capataz no vota: reparte

**Hoy** el esfuerzo se vota como una dimensión más de la boleta. Y el conteo, en
`maquina.ts`, es esto:

```ts
const viajerosConVigor = estado.viajeros.filter((v) => v.vigor > 0);
const ordenados = [...viajerosConVigor].sort((a, b) => votos[b.id] - votos[a.id]);
const decisionEsfuerzo = ordenados.slice(0, AVANCE.esfuerzoMax).map((v) => v.id);
```

No cuenta votos: **ordena por votos y se lleva los tres primeros, tengan votos o
no.** Con tres o cuatro viajeros sanos van todos al trabajo pesado siempre, aunque
nadie haya votado a nadie. La decisión más dolorosa del juego es hoy un
`slice(0, 3)`.

**Cambio**: el esfuerzo sale de la boleta. **Cada noche, el Capataz nombra solo a
quién manda al trabajo pesado** (hasta 3). Sigue desempatando ruta y raciones, y
sigue decidiendo todo en la última noche.

Por qué:

- Es el **pilar 3** (*"toda decisión duele contra una persona"*), que hoy no está
  implementado en ninguna parte: se vota contra opciones abstractas, nunca contra
  gente.
- **Le da al Capataz un trabajo todas las noches**, y del mejor tipo: uno que lo
  hace odiado. Toda la mesa lo lobbea durante los tres minutos. Eso *es* la
  discusión que el juego dice querer.
- **Crea una dependencia entre dos personas concretas**: el Capataz no ve el vigor
  (poder, no información) y la Curandera sí. La Curandera pasa a tener un
  interlocutor con nombre en vez de "el grupo".
- Arregla el bug de arriba de paso.

**Fricción obligatoria**: no se puede mandar a la misma persona dos noches
seguidas. Sin eso el óptimo es obvio (mandar siempre a los tres más enteros) y la
decisión se muere en la noche 2.

**Sin Capataz en la mesa** (2 y 3 jugadores, ver `REPARTO`): el esfuerzo es
**voluntario**. Cada uno declara si se ofrece. Con esa cantidad de gente no hace
falta una autoridad, y "me ofrezco" es un gesto que se dice en voz alta.

**Descartado — dejar el esfuerzo como voto y solo arreglar el conteo.** Arregla el
bug y no arregla el juego: seguirías votando contra una lista de nombres sin que
la decisión sea de nadie.

---

## Cirugía 3 — El reporte: la información es una decisión, no un dato

**Hoy** el Baqueano ve el terreno de un tramo y lo dice. La habilidad es un cable:
entra dato, sale dato.

**Cambio**: el celular te muestra lo que ves y después te pregunta **qué
reportás**. Tres opciones. Una es la verdad; las otras dos son **las descripciones
reales de los otros tramos**, presentadas como si fueran del tuyo.

```
Ves:  Paso del Viento → "piedra suelta, se sube despacio"

¿Qué le decís al grupo?
  ○ piedra suelta, se sube despacio        ← la verdad
  ○ barro hasta la rodilla, hay agua       ← es de La Vega
  ○ parejo y corto, sin reparo             ← es del Salitral Chico
```

Lo elegido aparece en la TV como *"El Baqueano dice: …"* y el jugador lo defiende
en voz alta. En el epílogo, la TV muestra qué era verdad y qué no.

- **Las opciones son estructuralmente indistinguibles**: todas son terrenos reales
  del tablero. No hay patrón que aprender, no hace falta el modelo, y no se puede
  detectar "la tercera siempre es la mentira".
- Recién acá la decisión de que el vigor viaje como texto y no como número
  ([01](specs/01-modelo-de-dominio.md) § Por qué el vigor no viaja como número)
  **tiene recompensa mecánica**. Hoy es una restricción sin nada del otro lado.
- **Límite: dos reportes falsos por travesía.** Es lo que sostiene el sistema. Si
  mentir es gratis, todos mienten siempre y la información vale cero. Con dos,
  cada mentira es cara, la información es *mayormente* cierta —vale la pena
  escuchar— y nunca segura —vale la pena discutir.

**No es traición** (D2): shadeás porque tu objetivo lo necesita, no porque ganes
si el grupo pierde. Es el *"gente con prioridades distintas"* que D2 prometió y
que hoy no existe en ninguna mecánica.

---

## Cirugía 4 — Los objetivos muerden

**Hoy** el objetivo se revela al final y, por D9, *"nunca hace perder a nadie"*. Es
decoración narrativa.

**Cambio**: dos marcadores independientes en el epílogo. La caravana llegó o no.
Vos conseguiste lo tuyo o no. Los cuatro cuadrantes son resultados válidos.

|  | Vos sí | Vos no |
|---|---|---|
| **Llegaron** | el héroe | el mártir |
| **No llegaron** | **el hijo de puta** | el desastre completo |

Y los objetivos tienen que **exigir conducta visible** durante las cinco noches,
no ser una condición pasiva que se mide al final:

| Objetivo | Qué te obliga a hacer |
|---|---|
| Que nadie llegue quebrado | Empujás abundante toda la partida |
| Llegar con la despensa llena | Empujás ajustado toda la partida ← **choca de frente** |
| Que te manden al esfuerzo tres noches | Le pedís al Capataz que te lastime, y explicás por qué |
| Llegar en cuatro noches | Empujás imprudencia |
| Que el perro llegue | Te oponés a explorarlo aunque convenga |

Requisito de diseño: **al menos dos objetivos en la mesa se estorban
activamente**. El checklist de [06 · Tableros](specs/06-tableros.md) ya lo pide
("los objetivos rozan entre sí y al menos dos se estorban"); hoy no se cumple
porque ninguno obliga a nada.

Y el trato pierde la cláusula de goma: **acerca tu objetivo y le cuesta al grupo
algo real, que se cobra en la última noche.** Sin costo no hay dilema, y sin
dilema el trato es un mensaje bonito.

---

## Cirugía 5 — Umbrales, no sumas

La más cara y la última. Sin ella el motor sigue siendo aritmética.

**Hoy**: `avance = 2 + esfuerzo − dureza`. Una resta. El resultado siempre es "un
poco más" o "un poco menos".

**Cambio**: cada tramo tiene una **exigencia**, un umbral que se cumple o no.

```
Paso del Viento    exige   3 al esfuerzo
  ✓ cumplido    → avance completo + hallazgo
  ✗ incumplido  → avance a medias + alguien se quiebra
```

**Los umbrales producen drama; las sumas producen aritmética.** *"Nos faltó uno"*
es la frase que hace que un grupo pida revancha. *"Avanzamos 3 en vez de 4"* no la
dijo nadie en la historia de los juegos de mesa.

Ahí también aparece la interacción no lineal que hoy falta: una exigencia puede
ser de esfuerzo, de vigor mínimo del grupo o de recurso en stock, y entonces las
tres decisiones dejan de ser independientes y empiezan a hablarse entre sí.

---

## Que vuelvan a jugar

Que la partida sea buena no alcanza. La revancha se pide por tres motivos, y los
tres son mecánicos y baratos:

**1. Un arrepentimiento con nombre.** *"Si en la noche 3 no tomábamos el río."* Lo
producen solas la cirugía 1 (boletas con nombre) y la 5 (umbrales que se fallan
por uno).

**2. Un margen visible al final.** Hoy el desenlace es binario: llegaron o no.
Poner la distancia exacta en la TV — *"faltaban dos leguas"*. El casi es lo que
hace que alguien diga "una más".

**3. Premios al final, mecánicos, no escritos por el modelo.** Veinte segundos con
títulos derivados de datos que el estado ya tiene:

```
EL QUE MÁS MINTIÓ         Beto (2 de 2)
EL MÁS CASTIGADO          Caro (4 noches al esfuerzo)
EL QUE NUNCA SE OFRECIÓ   Ana
EL QUE TENÍA RAZÓN        Dani (votó el paso 4 veces, 3 salieron bien)
```

Es un `reduce` sobre la crónica, no contenido. Son los apodos que `diseno.md`
menciona como válvula de humor, pero **derivados de conducta real** en vez de
generados. Un apodo que te ganaste es diez veces más gracioso que uno que te
escribieron.

---

## El orden, y su criterio de salida

### Fase 0 — Papel. Sin tocar código.

Cirugías 1 y 2 con fichas impresas y cinco personas.

**Criterio**: ¿alguien acusó a alguien en voz alta? ¿alguien se rió de la
revelación? ¿al terminar, la mesa contó qué pasó en la noche 3 sin que se lo
pidieras?

Si las tres son que no, el problema es más profundo que estas cinco cirugías y hay
que volver al diseño. **Éste es el M1 que nunca se cerró** ("¿el loop de una noche
es interesante sin animaciones?"): es el único hito que puede terminar en "esto no
va", y se salteó una vez.

### Fase 1 — Cirugías 1 y 2, en código

Más el fogón de M3.5, que ahora tiene contenido propio y deja de depender de que
el modelo escriba algo ingenioso a tiempo.

**Criterio**: en un playtest real alguien dice *"¡vos dijiste que…!"*. Si no pasa,
la revelación está mal presentada — no está mal la idea.

### Fase 2 — Cirugía 3

**Criterio**: alguien miente y lo atrapan. Y alguien miente y **no** lo atrapan. Si
nadie miente nunca, el límite de dos es muy caro o los objetivos todavía no
muerden.

### Fase 3 — Cirugía 4

**Criterio**: alguien gana lo suyo mientras la caravana fracasa, y la mesa se ríe
en vez de enojarse. Si se enojan de verdad, el objetivo era demasiado adversarial.

### Fase 4 — Cirugía 5 y calibración

Recién acá se tocan los números de `config.ts`. **15–20 partidas completas con
grupos distintos antes de declarar la forma cerrada.** Ahí se va a ver si vigor
0–3 es demasiado angosto: ajustado (−1) + hambre (−1) + esfuerzo (−1) quiebra a
alguien de una noche a la otra, y el quebrado no puede ir al esfuerzo, o sea que
se queda mirando jugar.

---

## Lo que no se hace todavía

| Descartado por ahora | Por qué |
|---|---|
| El tercer y cuarto tablero | Cuatro paisajes con un juego flojo adentro es cuatro veces el mismo problema. Los tableros multiplican, y hoy multiplican algo chico |
| Arte final de la TV, Cast, deploy | Es M5 y ahí se queda. Ya se construyó la cañería antes que la diversión una vez |
| Subir la mentira del perro | Con la cirugía 3 el perro deja de ser la única fuente de incertidumbre. Recalibrar después, no antes |
| Pedirle humor al modelo | Con boletas reveladas, mentiras atrapadas y premios por conducta, la risa sale de la mesa. El modelo escribe la piel, que es lo que D5 siempre dijo |
