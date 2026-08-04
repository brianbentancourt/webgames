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

| Pieza | Estado |
|---|---|
| Tipos, vistas y protocolo | ✅ |
| Salas, lobby y votación de tablero | ✅ |
| Tableros como datos | ✅ dos, La Sierra y El Salitral |
| Motor de reglas (`reducir()`) | ✅ una travesía completa, con tests |
| Cliente celular | ✅ las cinco noches, `entregar_objeto`, `responder_trato` |
| Tablero TV | ✅ fogata, candidatos, resolución, alertas, epílogo |
| Reconexión a mitad de partida | ✅ verificada de punta a punta |
| Relato por LLM | ⚠️ corre entero con los textos de respaldo; llamada real es M4 |

Verificado con un playtest automatizado real (WebSocket de punta a punta, no el
motor en memoria) y con Chromium real para `prefers-reduced-motion`. Ver
[`docs/specs/10-roadmap.md`](docs/specs/10-roadmap.md) para el detalle hito por
hito, incluidos dos bugs que ese playtest encontró y ya están corregidos.

## Las piezas

```
/core        tipos, vistas, protocolo y la máquina de estados
/tableros    escenarios como datos (paleta, tramos, mazos, voz)
/tv          renderer tonto: recibe estado y pinta
/control     una acción por pantalla
```

Las salas, el WebSocket y la capa del modelo son del repo, no del juego: viven en
[`apps/servidor`](../../apps/servidor).

## Próximo paso

M4: la llamada real al modelo. Hoy el juego corre entero con los textos de
respaldo de cada tablero — que es el mismo camino de código que corre cuando la
red está mal, así que ya se ejercita en cada partida de desarrollo. Falta la
llamada real, el presupuesto de tiempo contra la API, y las cinco escenas
(`resolucion`, `fogon`, `trato`, `apodo`, `epilogo`) de
[`docs/specs/07-capa-llm.md`](docs/specs/07-capa-llm.md).

## Documentación

- [`docs/diseno.md`](docs/diseno.md) — qué juego es
- [`docs/specs/`](docs/specs/) — cómo se implementa, doce documentos cortos
- [`../../docs/decisiones.md`](../../docs/decisiones.md) — por qué es así, con lo que se descartó
