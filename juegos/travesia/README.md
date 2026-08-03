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
| Salas y lobby | ✅ |
| Tableros como datos | ✅ dos, La Sierra y El Salitral |
| Motor de reglas | ❌ especificado, sin implementar |
| Tablero TV (render) | ⚠️ solo la pantalla de sala |
| Cliente celular | ⚠️ entrar y marcarse listo |
| Relato por LLM | ⚠️ corre entero con los textos de respaldo |

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

Motor de reglas de una noche completa, en memoria, sin red y sin UI. Si el loop de una noche
no es interesante en una terminal, no lo va a salvar ninguna animación.

Las reglas ya están escritas en [`docs/specs/03-reglas-de-resolucion.md`](docs/specs/03-reglas-de-resolucion.md);
falta el cuerpo de `reducir()`.

## Documentación

- [`docs/diseno.md`](docs/diseno.md) — qué juego es
- [`docs/specs/`](docs/specs/) — cómo se implementa, doce documentos cortos
- [`../../docs/decisiones.md`](../../docs/decisiones.md) — por qué es así, con lo que se descartó
