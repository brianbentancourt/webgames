/**
 * Servidor autoritativo. Habla WebSocket con dos clases de cliente: una TV que
 * abre la sala y N celulares que se suman con el código.
 *
 * ESTADO: lobby completo y funcionando (abrir sala, sumarse, reconectar, votar
 * tablero, marcar listo). Empezar la partida devuelve error hasta que exista el
 * motor: `reducir()` en @travesia/core es el próximo hito.
 */

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { VERSION_PROTOCOLO, leerEntrante, type MensajeSaliente } from '@travesia/core';
import { TABLEROS, validarTableros } from '@travesia/tableros';
import { config } from './config.js';
import { crearEstaticos } from './estaticos.js';
import { JUEGOS, montajes } from './juegos.js';
import { cerrarSala, crearSala, desconectar, obtenerSala, salaDe, unirse, type Sala } from './salas.js';

validarTableros();

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

function publicarSala(sala: Sala): void {
  const mensaje: MensajeSaliente = {
    t: 'sala',
    codigo: sala.codigo,
    jugadores: [...sala.asientos.values()].map((a) => ({
      id: a.id,
      nombre: a.nombre,
      listo: a.listo,
    })),
  };
  enviar(sala.tv, mensaje);
  for (const asiento of sala.asientos.values()) enviar(asiento.socket, mensaje);
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
    const asiento = [...sala.asientos.values()].find((a) => a.socket === socket);

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
        publicarSala(sala);
        return;
      }
      default:
        enviar(socket, {
          t: 'error',
          codigo: 'fuera_de_fase',
          mensaje: 'todavía no hay motor de reglas: solo funciona el lobby',
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
      publicarSala(sala);
    }
  });
});

http.listen(config.PUERTO, () => {
  console.log(`juegos · servidor en http://localhost:${config.PUERTO}`);
  for (const m of montados) console.log(`  ${m.prefijo} → ${m.raiz}`);
  if (montados.length === 0) console.log('  sin builds: cada cliente lo sirve su propio Vite');
});
