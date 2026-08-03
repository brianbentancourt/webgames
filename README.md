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

---

## Estructura

```
/apps
  /tv          cliente de TV — renderer tonto, solo pinta estado
  /control     cliente de celular — una acción por pantalla
  /server      motor de reglas (autoritativo) + salas + capa LLM
/packages
  /core        tipos y máquina de estados compartida
  /tableros    escenarios como datos (paleta, tramos, mazos, voz)
/docs
  diseno.md      diseño del juego
  decisiones.md  por qué las cosas son como son
  /specs         cómo se implementa
```

## Cómo se corre

```
pnpm install
pnpm dev          # servidor 8787 · tv 5173 · control 5174
```

Los celulares entran por la IP de la máquina en la misma red: alcanza para las
primeras mesas y no hace falta desplegar nada. Sin `ANTHROPIC_API_KEY` el juego
funciona igual, con los textos de respaldo de cada tablero.

`pnpm -r typecheck` · `pnpm test`

## Cómo se publica

```
docker compose up -d --build
```

Un contenedor que sirve los dos clientes y el WebSocket desde el mismo origen, más
un túnel de Cloudflare que lo publica en un subdominio con HTTPS, sin abrir puertos
en el router. Pasos en [`deploy/cloudflared/README.md`](deploy/cloudflared/README.md).

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

Las reglas ya están escritas en [`docs/specs/03-reglas-de-resolucion.md`](docs/specs/03-reglas-de-resolucion.md);
falta el cuerpo de `reducir()`.

## Documentación

- [`docs/diseno.md`](docs/diseno.md) — qué juego es
- [`docs/decisiones.md`](docs/decisiones.md) — por qué es así, con lo que se descartó
- [`docs/specs/`](docs/specs/) — cómo se implementa, trece documentos cortos
