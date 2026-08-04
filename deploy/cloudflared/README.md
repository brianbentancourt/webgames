# Publicar el juego con Cloudflare Tunnel

La PC de domótica corre el contenedor; el túnel lo publica en un hostname propio con
HTTPS y WSS. **No se abre ningún puerto en el router**: el túnel sale desde adentro.

## Antes de empezar

- El dominio tiene que estar con los nameservers de Cloudflare.
- Docker en la máquina que va a quedar prendida.

## Pasos

1. **Zero Trust → Networks → Tunnels → Create a tunnel**, tipo *Cloudflared*.
   Ponerle un nombre (`travesia`) y copiar el **token**.

2. En la pestaña **Public Hostnames** del túnel, agregar:

   | Campo | Valor |
   |---|---|
   | Subdomain | `juegos` |
   | Domain | `brianbentancourt.com` |
   | Service | `HTTP` → `juegos:8787` |

   El service apunta al **nombre del contenedor**, no a `localhost`: los dos
   contenedores comparten la red de compose.

3. En la máquina:

   ```
   echo "TUNNEL_TOKEN=..." >> .env
   docker compose up -d --build
   ```

4. Listo:

   | URL | Qué es |
   |---|---|
   | `https://juegos.brianbentancourt.com` | el menú |
   | `https://juegos.brianbentancourt.com/salvese` | la TV |
   | `https://juegos.brianbentancourt.com/salvese/control` | el celular |

## Un juego más

**No se toca nada de acá.** Los juegos cuelgan de rutas del mismo hostname, así que
alcanza con agregar la entrada en `apps/servidor/src/juegos.ts`, la carpeta en
`/juegos` y reconstruir el contenedor. Mismo túnel, mismo hostname, mismo Public
Hostname.

Si alguna vez un juego necesita su propio proceso —otro runtime, otra escala— ahí sí
se agrega un Public Hostname más apuntando a otro contenedor. Hasta entonces no hace
falta.

## Lo que hay que saber

**WebSockets**: Cloudflare los proxea sin configuración. El *idle timeout* es de
~100 segundos y este juego tiene tres minutos de silencio de red mientras la mesa
discute, así que el `ping` cada 25 s del protocolo no es opcional. Ya está en
`juegos/salvese/core/src/protocolo.ts`.

**Jugando en tu propia casa**, el tráfico sale a Cloudflare y vuelve. Son unos ms y
no se notan en este juego, pero si molesta, la alternativa es un registro DNS
interno apuntando a la IP de la máquina. Con `pnpm dev` en la misma red no hace
falta nada de esto.

**Cast** necesita HTTPS y una URL fija, y el túnel da las dos. La URL que se
registra en la Cast SDK Developer Console es la de la TV; cambiar de hostname
después obliga a volver a la consola.

**Al reiniciar el contenedor se cortan las partidas en curso**: el estado vive en
memoria. Con partidas de 25 minutos alcanza con no actualizar mientras hay gente
jugando.
