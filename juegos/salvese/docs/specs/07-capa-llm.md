# 07 · Capa LLM

Referencia: `juegos/salvese/core/src/llm.ts`, `apps/servidor/src/llm/adaptador.ts`.

**La IA es árbitro, generador y rival — nunca protagonista.** Si narra largo, todos
se callan y miran la TV, y el juego que estaba pasando en la mesa se apaga.

## Las tres reglas

1. **El modelo no lleva el estado** (`D5`). El motor determinista lleva reglas,
   recursos, posiciones y resolución. Un modelo que lleva el estado alucina, se
   olvida de sus propias reglas y termina haciendo trampa sin querer. Aluciná una
   vez las raciones y perdiste la mesa.
2. **Elige de un menú de jugadas válidas** que le arma el motor, y escribe la piel.
3. **Si falla, la mesa no se entera.** Hay presupuesto de tiempo y respaldo por
   escenario. Que el modelo falle nunca puede frenar una partida.

## El pedido

```ts
{
  escena: 'resolucion',
  voz: tablero.vozDelCamino,        // cómo se escribe
  hechos: [                          // qué pasó, ya calculado por el motor
    'la caravana tomó la quebrada seca',
    'avanzaron 3 leguas de 24',
    'se comió ajustado; Vale y Nico quedaron al límite',
    'apareció el catalejo rajado y lo carga Ceci',
  ],
  menu: [                            // de acá elige, o de nada
    { id: 'catalejo-rajado', que: 'el que lo carga ve un segundo tramo' },
    { id: 'manta-de-lana',   que: 'el que la carga puede pasar vigor' },
  ],
  limitePalabras: 40,
  fondos: ['fogata-cerro', 'filo-noche', ...],
}
```

Los `hechos` son la única fuente de verdad. **El texto se escribe sobre los hechos,
nunca al revés**: si el modelo dice que se perdieron dos días y el motor contó uno,
el motor tiene razón y el texto está mal.

## La respuesta

```ts
{ opcion: 'catalejo-rajado', texto: '…', fondo: 'filo-noche' }
```

Todo pasa por `validarRelato()` antes de tocar el estado:

| Qué llega | Qué pasa |
|---|---|
| No es objeto, o `texto` vacío | Respaldo |
| Había menú y no eligió, o eligió algo que no está | Respaldo |
| `fondo` que no está en la librería | Se ignora el fondo, el texto vale |
| Texto más largo que `limitePalabras` | Se recorta con puntos suspensivos |

Una opción inventada tira la respuesta entera al respaldo, sin negociación. El
recorte de texto, en cambio, no descarta: un relato de 45 palabras en vez de 40
sigue sirviendo, y el recorte queda como presión sobre el prompt.

## Cuándo se llama

Al **entrar** a la cutscene de resolución, no antes (`D6`). Los 7 segundos de
animación existen también para esconder la latencia; el presupuesto son 5,5.

```
entra a `resolver` ──┬── gatillo a la TV: animación de 7 s
                     └── pedido al modelo, sin bloquear (5,5 s de presupuesto)

llegó a tiempo  → el fogón muestra el relato
no llegó        → el fogón muestra el respaldo del tablero, y el que llega tarde se descarta
```

## Dónde aparece

| Escena | Qué escribe | Límite |
|---|---|---|
| `resolucion` | Qué pasó en el camino | 40 palabras |
| `fogon` | La pregunta incómoda al grupo | 20 palabras |
| `trato` | La oferta privada, en el celular de uno solo | 30 palabras |
| `apodo` | El apodo que el camino le pone a cada uno, desde la noche 2 | 6 palabras |
| `epilogo` | La crónica final | 120 palabras |

El apodo y el fogón son las válvulas de risa de un diseño que es seco por default.
El registro es **deadpan, no solemne**: el camino cuenta lo que pasó como quien
informa el clima.

## La IA como jugador

Con 2 jugadores la IA ocupa dos sillas y las actúa con opinión propia: discute,
insiste y se equivoca. Sigue sin llevar el estado — el motor le arma el menú de
boletas válidas y elige una, igual que con el relato. Que **se equivoque** es parte
del diseño: una IA que juega perfecto convierte la mesa en un trámite.

## Costo y modelo

Cinco a siete llamadas por partida de 25 minutos, con prompts cortos. El modelo por
defecto es el más rápido y barato de la familia (`config.MODELO`), porque acá la
latencia importa más que la calidad de la prosa: 40 palabras deadpan no necesitan
el modelo grande, y 3 segundos de más sí se notan en el living.

**Sin `ANTHROPIC_API_KEY` el juego funciona igual**, entero, con los respaldos de
cada tablero. Es el mismo camino de código que corre cuando la red está mal, así
que se ejercita solo en cada partida de desarrollo en vez de ser una rama que nadie
probó nunca.

## Lo que el modelo no hace, nunca

- Calcular avance, consumo, vigor o cualquier número.
- Decidir si el perro miente.
- Elegir a quién se le ofrece el trato.
- Inventar un objeto o un efecto que no esté en el mazo.
- Acordarse de algo de una noche anterior. Lo que hay que recordar va en `hechos`.
- Hablarle a un jugador por fuera de una escena declarada.
