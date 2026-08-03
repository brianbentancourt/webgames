/**
 * Salas en memoria. Una sala es un código de 4 letras, una TV y hasta 10 celulares.
 *
 * Deliberadamente sin base de datos: una partida dura 25 minutos y no sobrevive a
 * un reinicio del proceso. Si algún día hay que persistir, se persiste el log de
 * comandos y la semilla, no el estado (el motor es determinista).
 */

import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { LIMITES, jugadorId, salaId, type JugadorId, type SalaId, type EstadoPartida } from '@travesia/core';

/** Sin vocales: no salen palabras y no se confunden por teléfono. */
const ALFABETO = 'BCDFGHJKLMNPQRSTVWXYZ';

export interface Asiento {
  id: JugadorId;
  nombre: string;
  /** Token de reconexión. El celular lo guarda y vuelve con él. */
  sesion: string;
  listo: boolean;
  socket: WebSocket | null;
}

export interface Sala {
  codigo: SalaId;
  tv: WebSocket | null;
  asientos: Map<JugadorId, Asiento>;
  tableroVotado: Map<JugadorId, string>;
  creadaEn: number;
  partida?: EstadoPartida;
  timerId?: NodeJS.Timeout;
}

const salas = new Map<SalaId, Sala>();

export function crearSala(tv: WebSocket): Sala {
  let codigo: SalaId;
  do {
    codigo = salaId(
      Array.from({ length: 4 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join(''),
    );
  } while (salas.has(codigo));

  const sala: Sala = {
    codigo,
    tv,
    asientos: new Map(),
    tableroVotado: new Map(),
    creadaEn: Date.now(),
  };
  salas.set(codigo, sala);
  return sala;
}

export function obtenerSala(codigo: string): Sala | undefined {
  return salas.get(salaId(codigo.toUpperCase()));
}

export function cerrarSala(codigo: SalaId): void {
  const sala = salas.get(codigo);
  if (sala) {
    if (sala.timerId) clearTimeout(sala.timerId);
    salas.delete(codigo);
  }
}

export type ResultadoUnirse =
  | { ok: true; asiento: Asiento; volvio: boolean }
  | { ok: false; codigo: 'sala_llena' | 'sesion_invalida' };

export function unirse(
  sala: Sala,
  nombre: string,
  sesion: string | undefined,
  socket: WebSocket,
): ResultadoUnirse {
  if (sesion !== undefined) {
    const previo = [...sala.asientos.values()].find((a) => a.sesion === sesion);
    if (previo === undefined) return { ok: false, codigo: 'sesion_invalida' };
    // Reconectar es repintar: llega el estado y listo. No hay estado en el cliente (D4).
    previo.socket = socket;
    previo.nombre = nombre;
    return { ok: true, asiento: previo, volvio: true };
  }

  if (sala.asientos.size >= LIMITES.jugadoresMax) return { ok: false, codigo: 'sala_llena' };

  const asiento: Asiento = {
    id: jugadorId(randomUUID()),
    nombre,
    sesion: randomUUID(),
    listo: false,
    socket,
  };
  sala.asientos.set(asiento.id, asiento);
  return { ok: true, asiento, volvio: false };
}

/** Un jugador que se desconecta NO se va de la caravana: se marca y sigue. */
export function desconectar(sala: Sala, id: JugadorId): void {
  const asiento = sala.asientos.get(id);
  if (asiento !== undefined) asiento.socket = null;
}

export function salaDe(socket: WebSocket): Sala | undefined {
  for (const sala of salas.values()) {
    if (sala.tv === socket) return sala;
    for (const asiento of sala.asientos.values()) {
      if (asiento.socket === socket) return sala;
    }
  }
  return undefined;
}
