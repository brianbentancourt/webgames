# La Travesía

Party game web para jugar en el living. **La TV es el tablero, los celulares son las cartas.**

Una caravana cruza una sierra en cinco noches. Cada noche el grupo decide tres cosas hablando
cara a cara: por dónde seguir, cuánto comer y quién hace el trabajo pesado. Cada jugador sabe
algo que los demás no.

De 2 a 10 jugadores. Unos 25 minutos.

---

## La regla que ordena todo el diseño

> **La conversación es el juego. El dispositivo y la IA son el plus.**

Consecuencia práctica: ningún jugador debería tocar el celular más de **10 segundos por ronda**.
Todo lo que dure más es tiempo en el que la mesa está cabizbaja y en silencio.

Corolario: si la IA narra largo, todos se callan y miran la TV. La IA es árbitro, generador
y rival — nunca protagonista.

---

## Estado

Prototipo del tablero de TV funcionando (escena de fogata, animación de avance, relato
generado por modelo). Sin servidor, sin salas, sin celulares todavía.

| Pieza | Estado |
|---|---|
| Tablero TV (render) | prototipo |
| Motor de reglas | no empezado |
| Salas / websockets | no empezado |
| Cliente celular | no empezado |
| Relato por LLM | prototipo (llamada directa) |

---

## Estructura prevista

```
/apps
  /tv          cliente de TV — renderer tonto, solo pinta estado
  /control     cliente de celular — una acción por pantalla
  /server      motor de reglas (autoritativo) + salas + capa LLM
/packages
  /core        tipos y máquina de estados compartida
  /tableros    escenarios como datos (paleta, tramos, mazos, voz)
/docs
  diseno.md    diseño del juego
  decisiones.md  por qué las cosas son como son
```

## Decisión de arquitectura que sostiene todo

**El estado vive en el servidor. La TV solo se suscribe y pinta.** Las animaciones se disparan
por transición de estado, nunca por lógica del cliente.

Eso hace que reconectar sea trivial (llega el estado, se repinta) y que una app nativa de TV
en el futuro sea una carcasa alrededor del mismo cliente web, no un port del juego.

## Cómo entra el modelo sin romper nada

- El **motor determinista** lleva reglas, recursos, posiciones y resolución de turnos.
- El **LLM elige de un menú de jugadas válidas** que le arma el motor, y escribe la piel.
- El LLM nunca calcula ni recuerda el estado. Aluciná una vez las raciones y perdiste la mesa.

## Próximo paso

Motor de reglas de una noche completa, en memoria, sin red y sin UI. Si el loop de una noche
no es interesante en una terminal, no lo va a salvar ninguna animación.
