# Sálvese Quien Pueda

Party game web para jugar en el living. **La TV es el tablero, los celulares son las cartas.**

Cinco noches en la sierra. Cada noche la caravana se mete en el camino y la tele da
vuelta un tramo por vez. La plata que aparece se reparte entre los que siguen en el
camino. Después de cada tramo, todos eligen a la vez en el celular: **sigo** o **me
vuelvo** con lo que cargo. Si sale **dos veces el mismo peligro**, los que siguen
pierden todo lo que cargan esa noche.

De 3 a 10 jugadores. Unos 12 a 15 minutos. Se explica en treinta segundos.

---

## Por qué es divertido

- **Todos juegan siempre.** No hay turnos: cada vuelta, todos deciden a la vez, en un toque.
- **Una revelación cada veinte segundos.** Se da vuelta un tramo, se revela quién se volvió.
  El ritmo no deja agarrar el celular para otra cosa.
- **La codicia es pública.** Lo que carga cada uno se ve en la tele; lo guardado es secreto.
  "¡Estás cargando 14, volvete!" y "yo voy re atrás, tengo que seguir" son la charla del juego.
- **Volverse solo es el golpe maestro.** Lo que no se pudo repartir queda tirado en el camino
  y se lo llevan los próximos que vuelvan. Si volvés solo, es todo tuyo.
- **El perro olfatea lo que viene** y reacciona en público. Acierta casi siempre, nunca siempre.
- **Los premios del final** salen de lo que hizo cada uno: el codicioso, el gallina, el vivo,
  el temerario.

## Estado

| Pieza | Estado |
|---|---|
| Motor de reglas (`reducir()`), puro y determinista | ✅ con tests |
| Tableros: La Sierra (base) y El Salitral (difícil) | ✅ |
| Tablero TV: camino, cartel, campamento, perro, emboscada, balance, final | ✅ |
| Celular: sigo / me vuelvo, estado propio, baúl secreto, revancha | ✅ |
| Revancha con la misma mesa (y los que llegaron tarde) | ✅ |
| Calibración por simulación (`apps/servidor/src/travesia.test.ts`) | ✅ forma vigilada |
| Calibración con gente | ⏳ falta el playtest |

## Las piezas

```
/core        estado, reglas, vistas y protocolo
/tableros    escenarios como datos: peligros, hallazgos, paleta, fondos
/tv          renderer tonto: recibe la vista y pinta
/control     el celular: dos botones y "mirá la tele"
```

Las salas y el WebSocket son del repo, no del juego: viven en
[`apps/servidor`](../../apps/servidor).

## Documentación

- [`docs/diseno.md`](docs/diseno.md): qué juego es y por qué cada regla está ahí
- [`docs/estetica.md`](docs/estetica.md): papel recortado y stop-motion
- [`../../docs/decisiones.md`](../../docs/decisiones.md): por qué es así; el cambio de juego es `D24`
