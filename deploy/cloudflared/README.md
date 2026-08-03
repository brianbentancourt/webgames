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
   | Subdomain | `travesia` |
   | Domain | `brianbentancourt.com` |
   | Service | `HTTP` → `travesia:8787` |

   El service apunta al **nombre del contenedor**, no a `localhost`: los dos
   contenedores comparten la red de compose.

3. En la máquina:

   ```
   echo "TUNNEL_TOKEN=..." >> .env
   docker compose up -d --build
   ```

4. Listo: `https://travesia.brianbentancourt.com` es la TV y
   `https://travesia.brianbentancourt.com/control` es el celular.

## Un túnel, varios juegos

El repo va a tener más de un juego. Un mismo túnel soporta varios hostnames
públicos, así que cada juego se agrega como un Public Hostname más apuntando a su
propio contenedor:

```
travesia.brianbentancourt.com  → travesia:8787
<el que venga>.brianbentancourt.com → otro-juego:8788
```

No hace falta un túnel por juego ni un servidor por juego.

## Lo que hay que saber

**WebSockets**: Cloudflare los proxea sin configuración. El *idle timeout* es de
~100 segundos y este juego tiene tres minutos de silencio de red mientras la mesa
discute, así que el `ping` cada 25 s del protocolo no es opcional. Ya está en
`packages/core/src/protocolo.ts`.

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
