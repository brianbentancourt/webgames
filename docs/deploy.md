# Deploy

Lo que hay que hostear son dos cosas distintas: **un proceso vivo** con estado en
memoria y sockets abiertos, y **un puñado de bundles estáticos** — el menú, más dos
por juego.

## Cómo se despliega hoy

Un contenedor en una máquina que ya está prendida, publicado con Cloudflare Tunnel
en un subdominio propio. Los pasos concretos están en
[`deploy/cloudflared/README.md`](../deploy/cloudflared/README.md).

```
juegos.brianbentancourt.com/                  → el menú
juegos.brianbentancourt.com/salvese          → la TV
juegos.brianbentancourt.com/salvese/control  → el celular
juegos.brianbentancourt.com/api/juegos        → la lista que pinta el menú
juegos.brianbentancourt.com/ws                → el WebSocket
```

Un solo origen, un solo hostname, un solo túnel, cero puertos abiertos en el router.
El servidor sirve los `dist` de todos los clientes desde el mismo proceso que el
socket (`apps/servidor/src/estaticos.ts`): en desarrollo no monta nada y cada cliente
lo sirve su propio Vite.

**Un juego más no es infraestructura más.** Se agrega una entrada en
`apps/servidor/src/juegos.ts` y una carpeta en `/juegos`: de ahí salen las rutas que
se montan y la lista que consume el menú. Mismo contenedor, mismo túnel, mismo
hostname.

Todo lo que sigue es el porqué, y las alternativas para cuando esta deje de alcanzar.

## La restricción que decide todo

El estado vive en un proceso (`D4`). Una sala son sockets abiertos + timers de fase
+ estado mutable durante 25 minutos. Eso descarta de entrada todo lo serverless:
funciones que se apagan entre requests no pueden sostener una partida.

Y hay un corolario que se paga caro si se descubre tarde: **no se puede correr con
dos réplicas detrás de un balanceador round-robin.** Si el celular de Vale cae en
la instancia A y la TV en la B, la sala existe en una sola de las dos y no hay
error visible, sólo un juego que no anda.

Mientras el estado esté en memoria: **una instancia sola, escalada para arriba.**
No es una limitación real a esta escala — 25 minutos por partida, 10 personas por
sala, unos KB por transición: un proceso chico aguanta cientos de salas simultáneas.
Si algún día hay que escalar horizontal, la respuesta es ruteo por afinidad de sala,
no réplicas ciegas.

## Las tres formas, de menos a más

### 1 · La laptop, en la misma red

Para las primeras mesas no hace falta desplegar nada. Todos están en el mismo living
y en el mismo wifi:

```
pnpm dev            # servidor 8787 · portal 5172 · tv 5173 · control 5174
```

Vite ya levanta con `host: true`, así que los celulares entran por la IP de la
laptop. Cero infraestructura, cero costo, y el ciclo de iteración más rápido que vas
a tener.

**Limitación**: sin HTTPS no hay Cast. La TV va con un cable HDMI o con la laptop
enchufada al televisor.

### 2 · Un servicio, un dominio · **recomendado para el MVP**

El servidor Node sirve **también** los estáticos del menú y de cada juego. Un solo
proceso, un solo dominio, un solo deploy.

```
/                    → apps/portal/dist
/salvese            → juegos/salvese/tv/dist
/salvese/control    → juegos/salvese/control/dist
/ws                  → el WebSocket
```

Ventajas que no son menores: **mismo origen** (sin CORS, sin mixed content, sin
variable de entorno apuntando a otro host) y **una sola cosa que puede estar caída**.
El costo es no tener CDN, que a esta escala no compra nada: los bundles son chicos y
el público está a 30 ms.

| Dónde | Por qué | Costo |
|---|---|---|
| **Fly.io** | Máquinas persistentes, WS de primera, y región en Buenos Aires (`eze`) o São Paulo (`gru`) — importa cuando todos los jugadores están en el Río de la Plata | ~US$3–5/mes |
| **Railway** | El más simple: conectás el repo y anda. Sin región sudamericana propia | ~US$5/mes |
| **VPS + Caddy** (Hetzner, DigitalOcean) | Control total y TLS automático con Caddy. A cambio, el mantenimiento es tuyo | ~US$4/mes |

**Render en plan gratuito no sirve**: duerme el servicio por inactividad y despertar
tarda decenas de segundos. Es exactamente el momento en que cinco personas están
esperando frente a la tele.

### 3 · Estáticos aparte, cuando haya tráfico

`juegos/salvese/tv` y `juegos/salvese/control` a Cloudflare Pages o Netlify (gratis, CDN), el servidor
donde esté. Ahí sí aparecen CORS y una `VITE_SERVIDOR` apuntando a otro host, y
`tv` y `control` pasan a poder quedar desincronizados del servidor entre deploys.
Vale la pena recién cuando el CDN compre algo.

## Gratis, en serio

`juegos/salvese/tv` y `juegos/salvese/control` son estáticos: Cloudflare Pages, Netlify o Vercel los
hostean gratis para siempre y ninguno es la parte difícil. **Lo único que cuesta es
el proceso vivo.**

Estas son las opciones que sostienen un proceso Node con sockets abiertos sin pagar.
Ninguna es peor que las pagas para este juego; todas cuestan más tiempo de setup.

### Un VPS que no vence

| Dónde | Qué da | Letra chica |
|---|---|---|
| **Oracle Cloud Always Free** | Una VM ARM con hasta 4 vCPU y 24 GB, gratis sin vencimiento, con región en São Paulo | Conseguir capacidad ARM en las regiones populares puede llevar varios intentos, y Oracle se reserva reclamar instancias ociosas |
| **Google Cloud `e2-micro` Always Free** | 1 vCPU compartida, 1 GB, gratis sin vencimiento | Sólo en regiones de EE.UU. |
| AWS / Azure | `t3.micro` o `B1s` | Sólo 12 meses. Después se paga, y el corte llega cuando ya te olvidaste |

Sobre la latencia de la opción de Google: desde el Río de la Plata a `us-east` hay
~130 ms, **y a este juego no le importa**. Nadie hace clicks de precisión: se bloquea
una boleta cada tres minutos y el reloj lo lleva el servidor. Los 130 ms se los come
la conversación. La región de Fly en Buenos Aires es lindo tenerla, no es un requisito.

Con VPS, TLS lo resuelve **Caddy** en tres líneas de configuración y renueva solo.

### La máquina que ya tenés ← **la elegida**

Cloudflare Tunnel es gratis y publica un proceso de tu casa en un hostname HTTPS
propio, con WSS incluido y sin abrir puertos en el router. Una Raspberry Pi, un
notebook viejo o la PC de domótica alcanzan de sobra.

Para un juego que se juega en tu living con tus amigos, es la opción más honesta:
no hay servidor que mantener porque el servidor es una máquina que ya está prendida,
y el dominio ya está pago. Un mismo túnel publica varios hostnames, así que el
segundo juego del repo no va a necesitar infraestructura nueva.

### Cloudflare Workers + Durable Objects

El plan gratis alcanza para este juego, y es la opción que **mejor le calza a la
forma del problema**: un Durable Object *es* una sala con estado, y la API de
hibernación de WebSockets está hecha justo para conexiones que pasan minutos sin
mandar nada — que es exactamente lo que hace este juego mientras la mesa discute.

El costo es un rewrite de `apps/servidor`: hoy son unas 250 líneas contra `node:http`
y `ws`, y habría que pasarlas al runtime de Workers (`fetch` + `WebSocketPair`).
`juegos/salvese/core` y `juegos/salvese/tableros` no se tocan — no importan nada de Node, y esa
es justamente la razón por la que están separados.

No es la primera opción sólo porque ata el servidor a un runtime que no es Node y
complica correr todo en una laptop. Si el hosting tiene que ser gratis y siempre
disponible, es la mejor.

### Lo que no sirve

**Render en plan gratuito**: duerme por inactividad y despertar tarda decenas de
segundos, justo cuando hay cinco personas mirando la tele. Se puede evitar
despertándolo desde afuera cada pocos minutos, pero es una pieza más que se rompe
sola un viernes a la noche.

**Deno Deploy y cualquier cosa a base de isolates**: no garantizan que dos
conexiones caigan en la misma instancia, que es el corolario del principio de este
spec.

**Railway y Fly**: los planes gratuitos ya no existen como tales — Railway pasó a
crédito de prueba y Fly factura desde el arranque. Verificá al crear la cuenta,
porque esto cambia seguido.

> Lo de arriba se movió mucho en los últimos dos años. Antes de elegir, chequeá los
> límites actuales de la que te interese en vez de confiar en esta tabla.

## Lo que hay que tener sí o sí

**WSS, no WS.** Los celulares abren una página HTTPS y el navegador no deja abrir un
socket inseguro desde ahí. Cualquiera de las opciones de arriba da TLS; lo que no se
puede es servir la página por HTTPS y el socket por `ws://`.

**Keep-alive.** Casi todos los proxies cierran un WebSocket ocioso al minuto, y este
juego puede pasar un rato largo sin tráfico (el final, la sala esperando gente). El
mensaje `ping` ya está en el protocolo (`juegos/salvese/core/src/protocolo.ts`) y
mandarlo cada 25 segundos no es opcional en producción.

**Deploy sincronizado.** Cliente y servidor hablan la misma `VERSION_PROTOCOLO` y no
hay compatibilidad hacia atrás: se despliegan juntos.

**Una partida en curso no sobrevive a un deploy.** El estado está en memoria. Con
15 minutos por partida y salas que se abren de noche, alcanza con desplegar cuando
no hay salas activas; un chequeo antes de reiniciar es media hora de trabajo y evita
cortar una partida en la noche 4.

## Variables de entorno

| Variable | Dónde | Sin ella |
|---|---|---|
| `PUERTO` | servidor | 8787 |
| `VITE_SERVIDOR` | clientes | `ws://localhost:8787`. En la opción 2 no hace falta: mismo origen |

## Google Cast

El receiver es una web app (`D13`), así que es la misma build de `juegos/salvese/tv` servida
por HTTPS. Lo que hay que saber antes de contarlo como hecho:

- Hay que registrar la app en la Cast SDK Developer Console, con un **pago único de
  US$5**.
- El receiver se registra con una URL fija: cambiar de host obliga a volver a la
  consola.
- Para probar hay que registrar el Chromecast propio como dispositivo de desarrollo,
  y tarda un rato en propagarse.

Nada de eso es difícil, pero es un día de trabajo con esperas, no una tarde. Va después
de que el juego esté calibrado con gente, no antes.

## Lo que no se despliega todavía

Base de datos: no hay. Si algún día hay que persistir una partida, se persiste **la
semilla y el log de comandos**, no el estado — el motor es determinista y reconstruye
el resto. Son unos KB por partida y sirve igual para
compartir una crónica que para reproducir un bug.
