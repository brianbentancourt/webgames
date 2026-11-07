/**
 * Servidor autoritativo. Habla WebSocket con dos clases de cliente: una TV que
 * abre la sala y N celulares que se suman con el código.
 */

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  VERSION_PROTOCOLO,
  leerEntrante,
  type MensajeSaliente,
  reducir as reducirMotor,
  type Resultado,
  proyectarTV,
  proyectarJugador,
  type EstadoPartida,
  type Comando,
  type Efecto,
  type JugadorId,
} from '@salvese/core';
import { TABLEROS, obtenerTablero, validarTableros } from '@salvese/tableros';
import { config } from './config.js';
import { crearEstaticos } from './estaticos.js';
import { JUEGOS, montajes } from './juegos.js';
import { cerrarSala, crearSala, desconectar, obtenerSala, salaDe, unirse, type Sala, type Asiento } from './salas.js';
import { randomUUID } from 'node:crypto';

validarTableros();

/**
 * `reducir()` con red: una excepción del motor rechaza el comando en vez de
 * tirar abajo el proceso.
 *
 * Todas las llamadas al motor salen de un handler de `ws` o de un `setTimeout`,
 * y en los dos casos una excepción que no se atrapa termina el proceso entero
 * de Node: no se cae la partida que la provocó, se caen **todas las salas
 * abiertas**. Ya pasó con una mesa de 8, que salía del array de objetivos del
 * tablero al repartirlos y tiraba un `TypeError` en `empezar`.
 *
 * El motor devuelve rechazos en vez de lanzarlos por diseño (ver `Rechazo` en
 * maquina.ts), así que cualquier excepción de acá es un bug: se registra fuerte
 * y se sigue.
 */
function reducir(estado: EstadoPartida | null, comando: Comando): Resultado {
  try {
    return reducirMotor(estado, comando);
  } catch (error) {
    console.error(`[motor] excepción procesando "${comando.t}"`, error);
    return { ok: false, motivo: 'fuera_de_fase' };
  }
}

const montados = montajes();
const servirEstaticos = montados.length > 0 ? crearEstaticos(montados) : null;

const http = createServer((req, res) => {
  if (req.url === '/salud') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, version: VERSION_PROTOCOLO }));
    return;
  }
  // El menú se pinta con esto: una sola lista de juegos, la del servidor.
  if (req.url === '/api/juegos') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
    res.end(JSON.stringify(JUEGOS));
    return;
  }
  if (servirEstaticos !== null) {
    void servirEstaticos(req, res).then((atendido) => {
      if (!atendido) res.writeHead(404).end();
    });
    return;
  }
  res.writeHead(404).end();
});

// El socket vive en /ws para no pelear con las rutas de los estáticos.
const wss = new WebSocketServer({ server: http, path: '/ws' });

function enviar(socket: WebSocket | null, mensaje: MensajeSaliente): void {
  if (socket === null || socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(mensaje));
}

function publicarSala(sala: Sala, cuentaRegresiva?: number): void {
  if (sala.partida) {
    publicarVistasPartida(sala, 'todos');
    return;
  }
  const votos: Record<string, string> = {};
  for (const [jugador, tablero] of sala.tableroVotado) votos[jugador] = tablero;

  const mensaje: MensajeSaliente = {
    t: 'sala',
    codigo: sala.codigo,
    jugadores: [...sala.asientos.values()].map((a) => ({
      id: a.id,
      nombre: a.nombre,
      listo: a.listo,
    })),
    tableros: TABLEROS.map((t) => ({ id: t.id, nombre: t.nombre })),
    votos,
    ...(cuentaRegresiva !== undefined ? { cuentaRegresiva } : {}),
  };
  enviar(sala.tv, mensaje);
  for (const asiento of sala.asientos.values()) enviar(asiento.socket, mensaje);
}

/** Lo que le queda a la fase en curso, para que las pantallas pinten su reloj. */
function restanteMs(sala: Sala): number | null {
  if (sala.venceEn === undefined) return null;
  return Math.max(0, sala.venceEn - Date.now());
}

function publicarVistasPartida(sala: Sala, a: 'todos' | { jugador: JugadorId } = 'todos'): void {
  if (!sala.partida) return;
  const restante = restanteMs(sala);

  if (a === 'todos') {
    const conectados = new Set(
      [...sala.asientos.values()].filter((x) => x.socket !== null).map((x) => x.id),
    );
    enviar(sala.tv, { t: 'tv', vista: proyectarTV(sala.partida, { restanteMs: restante, conectados }) });
  }

  for (const asiento of sala.asientos.values()) {
    if (asiento.socket === null) continue;
    if (a !== 'todos' && a.jugador !== asiento.id) continue;
    const vista = proyectarJugador(sala.partida, asiento.id, { restanteMs: restante });
    enviar(asiento.socket, vista !== null ? { t: 'jugador', vista } : { t: 'en_espera' });
  }
}

/** Corre un comando contra el motor y aplica lo que devuelve. */
function correr(sala: Sala, comando: Comando): Resultado {
  const res = reducir(sala.partida ?? null, comando);
  if (res.ok) {
    sala.partida = res.estado;
    aplicarEfectos(sala, res.efectos);
  }
  return res;
}

function aplicarEfectos(sala: Sala, efectos: Efecto[]): void {
  for (const ef of efectos) {
    if (ef.t === 'agendar') {
      if (sala.faseTimerId) clearTimeout(sala.faseTimerId);
      sala.venceEn = Date.now() + ef.enMs;
      sala.faseTimerId = setTimeout(() => {
        delete sala.faseTimerId;
        delete sala.venceEn;
        if (sala.partida) correr(sala, { t: 'vencio_fase' });
      }, ef.enMs);
    } else if (ef.t === 'publicar') {
      publicarVistasPartida(sala);
    }
  }
}

function iniciarPartida(sala: Sala): void {
  // El tablero más votado; en empate, el primero de la lista.
  const conteo = new Map<string, number>();
  for (const t of sala.tableroVotado.values()) conteo.set(t, (conteo.get(t) ?? 0) + 1);
  let elegido = TABLEROS[0]!;
  let max = 0;
  for (const t of TABLEROS) {
    const n = conteo.get(t.id) ?? 0;
    if (n > max) {
      max = n;
      elegido = t;
    }
  }

  const res = correr(sala, {
    t: 'empezar',
    tablero: obtenerTablero(elegido.id) ?? elegido,
    semilla: randomUUID(),
    jugadores: [...sala.asientos.values()].map((a) => ({ id: a.id, nombre: a.nombre })),
  });
  if (!res.ok) console.error('no se pudo empezar la partida:', res.motivo);
}

wss.on('connection', (socket) => {
  socket.on('message', (crudo) => {
    const leido = leerEntrante(crudo.toString());
    if (!leido.ok) {
      enviar(socket, { t: 'error', codigo: leido.codigo, mensaje: 'no se entendió el mensaje' });
      return;
    }
    const msg = leido.mensaje;

    if (msg.t === 'ping') {
      enviar(socket, { t: 'pong' });
      return;
    }

    if (msg.t === 'abrir_sala') {
      const sala = crearSala(socket);
      enviar(socket, { t: 'bienvenida', version: VERSION_PROTOCOLO, sala: sala.codigo });
      publicarSala(sala);
      return;
    }

    if (msg.t === 'unirse') {
      const sala = obtenerSala(msg.sala);
      if (sala === undefined) {
        enviar(socket, { t: 'error', codigo: 'sala_inexistente', mensaje: 'no existe esa sala' });
        return;
      }
      const r = unirse(sala, msg.nombre, msg.sesion, socket);
      if (!r.ok) {
        enviar(socket, { t: 'error', codigo: r.codigo, mensaje: 'no se pudo entrar' });
        return;
      }
      // Cancela la cuenta regresiva de "todos listos" si alguien se sumó o
      // volvió mientras contaba. Nunca toca `faseTimerId`: una partida en
      // curso no tiene cuenta regresiva que cancelar, tiene un reloj de
      // noche que no puede parar porque alguien reconectó (ver salas.ts).
      if (!sala.partida && sala.lobbyTimerId) {
        clearTimeout(sala.lobbyTimerId);
        delete sala.lobbyTimerId;
      }
      enviar(socket, {
        t: 'bienvenida',
        version: VERSION_PROTOCOLO,
        sala: sala.codigo,
        jugador: r.asiento.id,
        sesion: r.asiento.sesion,
      });
      publicarSala(sala);
      return;
    }

    const sala = salaDe(socket);
    if (sala === undefined) {
      enviar(socket, { t: 'error', codigo: 'sala_inexistente', mensaje: 'no estás en una sala' });
      return;
    }

    if (msg.t === 'quitar_jugador') {
      if (sala.tv !== socket) {
        enviar(socket, { t: 'error', codigo: 'jugada_invalida', mensaje: 'solo la TV puede quitar jugadores' });
        return;
      }
      // Con la partida andando, el que se va sigue en la mesa: si no elige,
      // sigue por defecto. Sacarlo a mitad de una noche rompería el reparto.
      if (sala.partida) return;
      const jugId = msg.jugador as any;
      const asientoABorrar = sala.asientos.get(jugId);
      if (asientoABorrar) {
        if (asientoABorrar.socket) {
          enviar(asientoABorrar.socket, { t: 'error', codigo: 'fuera_de_fase', mensaje: 'fuiste removido de la sala por el anfitrión' });
          asientoABorrar.socket.close();
        }
        sala.asientos.delete(jugId);
        sala.tableroVotado.delete(jugId);
      }
      const viajeros = [...sala.asientos.values()];
      const todosListos = viajeros.length >= 2 && viajeros.every((a) => a.listo);
      if (!todosListos && sala.lobbyTimerId) {
        clearTimeout(sala.lobbyTimerId);
        delete sala.lobbyTimerId;
      }
      publicarSala(sala);
      return;
    }

    const asiento = [...sala.asientos.values()].find((a) => a.socket === socket);

    if (sala.partida) {
      if (asiento === undefined) return;
      let comando: Comando | null = null;
      if (msg.t === 'elegir') comando = { t: 'elegir', jugador: asiento.id, opcion: msg.opcion };
      else if (msg.t === 'revancha')
        // La mesa de la revancha es la sala de ahora: entran los que llegaron
        // tarde y quedan afuera los que la TV sacó.
        comando = {
          t: 'revancha',
          jugador: asiento.id,
          jugadores: [...sala.asientos.values()].map((a) => ({ id: a.id, nombre: a.nombre })),
        };

      if (comando === null) {
        enviar(socket, { t: 'error', codigo: 'fuera_de_fase', mensaje: 'eso no se puede ahora' });
        return;
      }
      const res = correr(sala, comando);
      // Un toque que llega tarde (la ventana ya cerró) no es un error de nadie:
      // se le repinta el celular con lo que hay y listo.
      if (!res.ok) publicarVistasPartida(sala, { jugador: asiento.id });
      return;
    }

    switch (msg.t) {
      case 'votar_tablero': {
        if (asiento === undefined) return;
        if (!TABLEROS.some((t) => t.id === msg.tablero)) {
          enviar(socket, { t: 'error', codigo: 'jugada_invalida', mensaje: 'ese tablero no existe' });
          return;
        }
        sala.tableroVotado.set(asiento.id, msg.tablero);
        publicarSala(sala);
        return;
      }
      case 'listo': {
        if (asiento === undefined) return;
        asiento.listo = msg.listo;

        const viajeros = [...sala.asientos.values()];
        const todosListos = viajeros.length >= 2 && viajeros.every((a) => a.listo);
        if (todosListos) {
          if (sala.lobbyTimerId) return;
          let segundosRestantes = 5;
          const tick = () => {
            if (segundosRestantes > 0) {
              publicarSala(sala, segundosRestantes);
              segundosRestantes--;
              sala.lobbyTimerId = setTimeout(tick, 1000);
            } else {
              delete sala.lobbyTimerId;
              iniciarPartida(sala);
            }
          };
          tick();
        } else {
          if (sala.lobbyTimerId) {
            clearTimeout(sala.lobbyTimerId);
            delete sala.lobbyTimerId;
          }
          publicarSala(sala);
        }
        return;
      }
      default:
        enviar(socket, {
          t: 'error',
          codigo: 'fuera_de_fase',
          mensaje: 'comando inválido',
        });
    }
  });

  socket.on('close', () => {
    const sala = salaDe(socket);
    if (sala === undefined) return;
    if (sala.tv === socket) {
      // Sin TV no hay tablero. La sala se cae con ella.
      cerrarSala(sala.codigo);
      return;
    }
    const asiento = [...sala.asientos.values()].find((a) => a.socket === socket);
    if (asiento !== undefined) {
      desconectar(sala, asiento.id);
      const viajeros = [...sala.asientos.values()];
      const todosListos = viajeros.length >= 2 && viajeros.every((a) => a.listo);
      if (!todosListos && sala.lobbyTimerId) {
        clearTimeout(sala.lobbyTimerId);
        delete sala.lobbyTimerId;
      }
      publicarSala(sala);
    }
  });
});

http.listen(config.PUERTO, () => {
  console.log(`juegos · servidor en http://localhost:${config.PUERTO}`);
  for (const m of montados) console.log(`  ${m.prefijo} → ${m.raiz}`);
  if (montados.length === 0) console.log('  sin builds: cada cliente lo sirve su propio Vite');
});
