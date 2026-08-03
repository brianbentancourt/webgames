# Specs

Cómo funciona lo que hay que construir. Son doce documentos cortos: si uno crece más
de dos pantallas, algo se está explicando en el lugar equivocado.

**No repiten `diseno.md`.** El diseño dice *qué juego es*; los specs dicen *cómo se
implementa*. Cuando un spec necesita justificar una elección, cita la decisión
(`D1`…`D15`) en vez de volver a argumentarla.

| # | Spec | De qué responde |
|---|---|---|
| [00](00-glosario.md) | Glosario | Cómo se llama cada cosa, en la mesa y en el código |
| [01](01-modelo-de-dominio.md) | Modelo de dominio | Qué guarda el estado y qué invariantes no se rompen |
| [02](02-maquina-de-estados.md) | Máquina de estados | Fases, transiciones, comandos y efectos |
| [03](03-reglas-de-resolucion.md) | Reglas de resolución | Cómo se cuenta una noche. El corazón del motor |
| [04](04-protocolo.md) | Protocolo | Qué viaja por el socket y en qué orden |
| [05](05-vistas-por-rol.md) | Vistas por rol | Quién ve qué, y por qué se proyecta en el servidor |
| [06](06-tableros.md) | Tableros | Cómo se agrega un tablero sin tocar el motor |
| [07](07-capa-llm.md) | Capa LLM | Qué se le pide al modelo y qué pasa cuando falla |
| [08](08-cliente-tv.md) | Cliente TV | Reglas de render a tres metros |
| [09](09-cliente-control.md) | Cliente celular | Una acción por pantalla, diez segundos |
| [10](10-roadmap.md) | Roadmap | En qué orden y con qué criterio se cierra cada hito |
| [11](11-testing.md) | Testing | Qué se testea, qué no, y por qué el motor es determinista |

Dónde corre esto no es del juego sino del repo: está en
[`docs/deploy.md`](../../../../docs/deploy.md).

## Estado

Todos los specs están escritos; lo implementado es otra cosa. La columna que manda es
la del [roadmap](10-roadmap.md).

| Pieza | Spec | Código |
|---|---|---|
| Tipos y protocolo | ✅ | ✅ |
| Motor de reglas | ✅ | ❌ `reducir()` lanza |
| Salas y lobby | ✅ | ✅ |
| Vistas por rol | ✅ | ❌ |
| Capa LLM | ✅ | ⚠️ solo respaldos |
| Cliente TV | ✅ | ⚠️ solo la pantalla de sala |
| Cliente celular | ✅ | ⚠️ solo entrar y marcarse listo |

## Cómo cambiar un spec

Si el cambio es de implementación, se edita el spec y listo. Si el cambio toca *qué
juego es* —una regla, un límite, el ritmo— va primero a `decisiones.md` como entrada
nueva, con lo que se descartó. Un spec nunca contradice una decisión en silencio.
