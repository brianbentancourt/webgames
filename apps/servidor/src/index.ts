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
  reducir,
  proyectarTV,
  proyectarJugador,
  partidaId,
  type EstadoPartida,
  type Comando,
  type Efecto,
  type PedidoRelato,
  VIGOR_INICIAL,
  jugadorId,
  type JugadorId,
} from '@travesia/core';
import { TABLEROS, validarTableros } from '@travesia/tableros';
import { config } from './config.js';
import { crearEstaticos } from './estaticos.js';
import { JUEGOS, montajes } from './juegos.js';
import { cerrarSala, crearSala, desconectar, obtenerSala, salaDe, unirse, type Sala, type Asiento } from './salas.js';
import { randomUUID } from 'node:crypto';
import { pedirRelato } from './llm/adaptador.js';

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

function publicarSala(sala: Sala, cuentaRegresiva?: number): void {
  if (sala.partida) {
    publicarVistasPartida(sala, 'todos');
    return;
  }
  const mensaje: MensajeSaliente = cuentaRegresiva !== undefined
    ? {
        t: 'sala',
        codigo: sala.codigo,
        jugadores: [...sala.asientos.values()].map((a) => ({
          id: a.id,
          nombre: a.nombre,
          listo: a.listo,
        })),
        cuentaRegresiva,
      }
    : {
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

function publicarVistasPartida(sala: Sala, a: 'todos' | 'tv' | { jugador: JugadorId }): void {
  if (!sala.partida) return;

  if (a === 'todos' || a === 'tv') {
    const vistaTV = proyectarTV(sala.partida);
    enviar(sala.tv, { t: 'tv', vista: vistaTV });
  }

  if (a === 'todos') {
    for (const asiento of sala.asientos.values()) {
      if (asiento.socket) {
        const vistaJugador = proyectarJugador(sala.partida, asiento.id);
        enviar(asiento.socket, { t: 'jugador', vista: vistaJugador });
      }
    }
  } else if (typeof a === 'object' && 'jugador' in a) {
    const asiento = sala.asientos.get(a.jugador);
    if (asiento && asiento.socket) {
      const vistaJugador = proyectarJugador(sala.partida, asiento.id);
      enviar(asiento.socket, { t: 'jugador', vista: vistaJugador });
    }
  }
}

function aplicarEfectos(sala: Sala, efectos: Efecto[]): void {
  for (const ef of efectos) {
    if (ef.t === 'agendar') {
      if (sala.timerId) clearTimeout(sala.timerId);
      sala.timerId = setTimeout(() => {
        if (!sala.partida) return;
        const res = reducir(sala.partida, { t: 'vencio_fase' });
        if (res.ok) {
          sala.partida = res.transicion.estado;
          aplicarEfectos(sala, res.transicion.efectos);
        }
      }, ef.enMs);
    } else if (ef.t === 'publicar') {
      publicarVistasPartida(sala, ef.a);
    } else if (ef.t === 'pedir_relato') {
      void pedirRelatoLLM(sala, ef.pedido);
    } else if (ef.t === 'terminar') {
      cerrarSala(sala.codigo);
    }
  }
}

async function pedirRelatoLLM(sala: Sala, pedido: PedidoRelato) {
  if (!sala.partida) return;
  const cronica = sala.partida.cronica;
  const ultimaCronica = cronica[cronica.length - 1];
  if (!ultimaCronica) return;

  const respaldoText = ultimaCronica.relato;
  const resultado = await pedirRelato(pedido, { texto: respaldoText });

  if (!sala.partida) return;
  const res = reducir(sala.partida, { t: 'relato_listo', escena: pedido.escena, resultado });
  if (res.ok) {
    sala.partida = res.transicion.estado;
    aplicarEfectos(sala, res.transicion.efectos);
  }
}

function iniciarPartidaReal(sala: Sala, viajeros: Asiento[]) {
  const votosTablero = new Map<string, number>();
  for (const tab of sala.tableroVotado.values()) {
    votosTablero.set(tab, (votosTablero.get(tab) || 0) + 1);
  }
  let tableroElegido = 'la-sierra';
  let maxVotos = 0;
  for (const [tab, v] of votosTablero.entries()) {
    if (v > maxVotos) {
      maxVotos = v;
      tableroElegido = tab;
    }
  }

  let estadoPartida: EstadoPartida = {
    id: partidaId(randomUUID()),
    tablero: tableroElegido as any,
    semilla: randomUUID(),
    fase: 'lobby',
    noche: 0,
    nochesTotales: 0,
    avance: 0,
    distanciaTotal: 0,
    recurso: 0,
    capacidad: 0,
    viajeros: viajeros.map((a, idx) => ({
      id: a.id,
      nombre: a.nombre,
      rol: 'pasajero',
      asiento: idx,
      vigor: VIGOR_INICIAL,
      objetivo: '' as any,
      conectado: true,
      cegado: false,
      aceptoElTrato: false,
      listo: true,
    })),
    perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
    objetos: [],
    cronica: [],
  };

  let res = reducir(estadoPartida, {
    t: 'crear',
    tablero: tableroElegido as any,
    semilla: estadoPartida.semilla,
  });
  if (res.ok) {
    estadoPartida = res.transicion.estado;
    estadoPartida.viajeros = viajeros.map((a, idx) => ({
      id: a.id,
      nombre: a.nombre,
      rol: 'pasajero',
      asiento: idx,
      vigor: VIGOR_INICIAL,
      objetivo: '' as any,
      conectado: true,
      cegado: false,
      aceptoElTrato: false,
      listo: true,
    }));
    const resEmp = reducir(estadoPartida, { t: 'empezar' });
    if (resEmp.ok) {
      sala.partida = resEmp.transicion.estado;
      aplicarEfectos(sala, resEmp.transicion.efectos);
    } else {
      console.error('Error al empezar partida:', resEmp.motivo);
    }
  }
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
      if (sala.timerId) {
        clearTimeout(sala.timerId);
        delete sala.timerId;
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
      if (!todosListos && sala.timerId) {
        clearTimeout(sala.timerId);
        delete sala.timerId;
      }
      publicarSala(sala);
      return;
    }

    const asiento = [...sala.asientos.values()].find((a) => a.socket === socket);

    if (sala.partida) {
      let comandoPartida: Comando | null = null;

      if (msg.t === 'elegir') {
        if (asiento === undefined) return;
        comandoPartida = {
          t: 'elegir',
          jugador: asiento.id,
          ruta: msg.ruta as any,
          raciones: msg.raciones as any,
          esfuerzo: msg.esfuerzo as any,
        };
      } else if (msg.t === 'bloquear') {
        if (asiento === undefined) return;
        comandoPartida = {
          t: 'bloquear',
          jugador: asiento.id,
        };
      } else if (msg.t === 'responder_trato') {
        if (asiento === undefined) return;
        comandoPartida = {
          t: 'responder_trato',
          jugador: asiento.id,
          acepta: msg.acepta,
        };
      } else if (msg.t === 'entregar_objeto') {
        if (asiento === undefined) return;
        comandoPartida = {
          t: 'entregar_objeto',
          de: asiento.id,
          a: msg.a as any,
        };
      }

      if (comandoPartida !== null) {
        const res = reducir(sala.partida, comandoPartida);
        if (res.ok) {
          sala.partida = res.transicion.estado;
          aplicarEfectos(sala, res.transicion.efectos);
        } else {
          const codigoErr = res.motivo === 'jugador_desconocido' ? 'jugada_invalida' : res.motivo;
          enviar(socket, { t: 'error', codigo: codigoErr, mensaje: 'movimiento inválido' });
        }
      }
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
          if (sala.timerId) return;
          let segundosRestantes = 5;
          const tick = () => {
            if (segundosRestantes > 0) {
              publicarSala(sala, segundosRestantes);
              segundosRestantes--;
              sala.timerId = setTimeout(tick, 1000);
            } else {
              delete sala.timerId;
              iniciarPartidaReal(sala, viajeros);
            }
          };
          tick();
        } else {
          if (sala.timerId) {
            clearTimeout(sala.timerId);
            delete sala.timerId;
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
      if (!todosListos && sala.timerId) {
        clearTimeout(sala.timerId);
        delete sala.timerId;
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
