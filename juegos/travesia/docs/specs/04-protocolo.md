# 04 · Protocolo

Referencia: `juegos/travesia/core/src/protocolo.ts`.

WebSocket, JSON, un campo `t` que discrimina. Sin REST: lo único que se hace por
HTTP es `/salud`.

## Asimetría deliberada

Lo que **entra** se valida con zod, siempre, sin excepción: viene de la red y no se
confía en nada. Lo que **sale** son tipos de TypeScript nada más, porque el emisor
es el dueño del estado y validar la propia salida sólo esconde bugs detrás de un
error genérico.

`leerEntrante()` nunca lanza: devuelve el error como valor. Un mensaje ilegible
responde `error` y no tira la conexión — un celular con una versión vieja de la
página no puede sacar a nadie de la partida.

## Cliente → servidor

| `t` | Quién | Cuándo |
|---|---|---|
| `abrir_sala` | Sólo la TV | Al conectar. Es el único cliente que puede crear una sala |
| `unirse` | Celular | Con código de 4 letras y nombre. Con `sesion`, vuelve a su asiento |
| `votar_tablero` | Celular | En `lobby` |
| `listo` | Celular | En `lobby` |
| `elegir` | Celular | En `decidir`. Parcial y repetible: actualiza la boleta en curso |
| `bloquear` | Celular | En `decidir`. Cierra la boleta; desde acá no se cambia |
| `responder_trato` | Sólo el destinatario | En la noche de la oferta |
| `entregar_objeto` | Celular | En `acampar` o `fogon` |
| `ping` | Cualquiera | Cada 25 s. Ver *Conexiones que se caen solas* |

## Servidor → cliente

| `t` | A quién | Contenido |
|---|---|---|
| `bienvenida` | Al que conecta | Versión, código de sala, y para celulares su `jugador` y `sesion` |
| `sala` | Todos | Quién está y quién marcó listo |
| `tv` | Sólo la TV | `VistaTV` completa |
| `jugador` | A cada celular | Su `VistaJugador`, distinta para cada uno |
| `error` | Al que se equivocó | Código y mensaje corto en castellano |
| `pong` | Al que preguntó | — |

## Se manda el estado entero

Nada de parches ni deltas. Cada transición manda la vista completa a cada cliente
(`D4`).

Es más tráfico y no importa: una `VistaTV` son unos pocos KB y hay menos de una
transición por segundo. A cambio, **reconectar y arrancar de cero son el mismo
camino de código**, que es la clase de simplificación que evita la familia entera
de bugs donde dos clientes muestran cosas distintas del mismo estado.

## Secuencias

**Abrir la partida**

```
TV  → abrir_sala
TV  ← bienvenida { sala: "KFRT" }
TV  ← sala { jugadores: [] }
celu → unirse { sala: "KFRT", nombre: "Vale" }
celu ← bienvenida { jugador, sesion }
TV, celus ← sala { jugadores: [Vale] }
```

**Una noche**

```
todos  ← tv/jugador (fase acampar)     ← el servidor agenda 20 s
todos  ← tv/jugador (fase decidir)     ← agenda la ventana de la fogata
celu   → elegir { ruta }
celu   → elegir { raciones, esfuerzo }
celu   → bloquear
TV     ← tv (Vale pasa a "listo")
       … bloquearon todos, o venció el tiempo …
todos  ← tv/jugador (fase resolver)    ← gatillo { tipo: 'resolucion' }
                                          y en paralelo, pedido al modelo
todos  ← tv/jugador (fase fogon)       ← con el relato, o con el respaldo
```

**Volver después de un corte**

```
celu → unirse { sala: "KFRT", nombre: "Vale", sesion: "..." }
celu ← bienvenida { jugador: <el mismo de antes> }
celu ← jugador { vista completa de la fase en curso }
```

## Errores

| Código | Qué pasó |
|---|---|
| `sala_inexistente` | El código no existe, o la TV se fue y la sala se cayó con ella |
| `sala_llena` | Ya hay 10. El límite es de aire para hablar, no técnico (`D14`) |
| `sesion_invalida` | El token no corresponde a ningún asiento de esta sala |
| `fuera_de_fase` | El comando es válido pero no ahora |
| `jugada_invalida` | El mensaje parseó pero pide algo imposible |
| `version_incompatible` | El cliente habla otra versión del protocolo |
| `mensaje_ilegible` | No es JSON, o no matchea ningún schema |

Ningún error cierra la conexión. El cliente muestra el mensaje y sigue.

## Versionado

`VERSION_PROTOCOLO` entero, en `bienvenida`. Si no coincide, el servidor manda
`version_incompatible` y el cliente muestra *"recargá la página"*. No hay
negociación ni compatibilidad hacia atrás: cliente y servidor se despliegan juntos
y una partida dura 25 minutos.

## Conexiones que se caen solas

Casi todos los proxies y PaaS cierran un WebSocket ocioso al minuto, y en este
juego hay tres minutos de silencio de red mientras la mesa discute. Por eso el
`ping` cada 25 segundos desde el cliente, y el servidor responde `pong`.

En el celular, además, hay que manejar `visibilitychange`: si alguien bloquea la
pantalla y vuelve, iOS ya cortó el socket. El cliente reconecta con su token y le
llega el estado; no tiene que hacer nada especial.
