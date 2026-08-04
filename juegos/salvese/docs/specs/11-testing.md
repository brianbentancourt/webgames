# 11 · Testing

Vitest en la raíz, `pnpm test`. Lo que se testea sale de una pregunta: **¿qué error
arruinaría una noche de juego con gente sentada en el living?**

## El determinismo es la herramienta principal

Misma semilla + misma secuencia de comandos = misma partida, bit a bit. Todo el
azar sale del `Rng` de `juegos/salvese/core/src/rng.ts` y `Math.random()` no aparece
en ningún otro lado del motor.

Eso compra tres cosas:

1. Tests de reglas que no parpadean.
2. Un bug reportado se reproduce con la semilla y el log de comandos. No hace falta
   guardar el estado ni pedirle una captura a nadie.
3. Se puede correr una travesía diez mil veces con semillas distintas y ver la
   distribución de resultados, que es la única forma seria de calibrar los números
   de `config.ts`.

Hay un test que lo cuida: dos partidas con la misma semilla y los mismos comandos
tienen que dar estados idénticos.

## Qué se testea

| Qué | Cómo |
|---|---|
| **Conteo de boletas** | Tabla de casos: mayoría, empate con Capataz, empate sin Capataz, noche 5, oposición unánime, boleta ausente |
| **Orden de resolución** | Los doce pasos, con casos donde el orden cambia el resultado (que se acabe el recurso *antes* de aplicar el efecto de raciones da otro vigor final) |
| **Invariantes** | Las once de [01](01-modelo-de-dominio.md), después de cada comando de una partida aleatoria larga |
| **Proyección** | Que ningún campo secreto aparezca en una vista. Se serializa la vista y se busca el valor secreto en el JSON |
| **Protocolo** | Que `leerEntrante()` no lance nunca, con basura, JSON válido pero inesperado y mensajes de otra versión |
| **Tableros** | `validarTableros()` contra el schema, y el checklist de [06](06-tableros.md) que sea automatizable |
| **Validación del modelo** | `validarRelato()` con opción inventada, texto vacío, texto largo, fondo que no existe |
| **Final de travesía** | Las tres condiciones de fin, incluida la abrupta |

## El test de la proyección

Es el más importante del proyecto, porque es el único bug que **no se nota
jugando** hasta que alguien abre el inspector y el juego se termina para todo el
grupo.

```
para cada jugador:
  vista = proyectarJugador(estado, jugador)
  json  = JSON.stringify(vista)
  para cada secreto del estado (objetivos ajenos, vigor numérico,
                                boletas ajenas, perro.dice_la_verdad, semilla):
    assert !json.includes(secreto)
```

Corre sobre una partida generada al azar en cada fase. Es tosco a propósito: busca
el valor en el JSON en vez de confiar en los tipos, porque un `any` mal puesto o un
spread de más pasa el compilador y no pasa esto.

## Lo que no se testea

- **Los números de balance.** Que comer ajustado cueste 1 de vigor no es una regla,
  es una perilla. Un test ahí sólo obliga a editar dos lugares cada vez que se
  calibra.
- **El texto del modelo.** No es determinista y no debería serlo. Se testea el
  validador y el respaldo, no la prosa.
- **La UI.** Sin tests de componentes ni snapshots: la TV es un renderer tonto y lo
  que hay que verificar de ella —que se lea a tres metros, que la cutscene sincronice
  a la mesa— no lo contesta ningún test automático.
- **El transporte.** `ws` funciona. Se testea el manejo de mensajes, no el socket.

## Con gente

Lo único que decide si el juego sirve. Cada hito del [roadmap](10-roadmap.md)
termina en una mesa real, y lo que se mira no es lo que dicen sino:

- ¿Alguien miró el celular mientras los demás hablaban?
- ¿Se callaron solos en la cutscene?
- ¿Hubo una discusión de dos minutos sobre quién carga el objeto?
- Al terminar, ¿contaron lo que pasó? **La partida deja una anécdota: ese es el
  producto real.**
- ¿Pidieron jugar otra?

La última es la única métrica que importa y no la mide ningún test.
