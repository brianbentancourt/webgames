/**
 * Protocolo de la conexión entre el servidor, la TV y los celulares.
 *
 * Asimetría a propósito: lo que llega del cliente se valida con zod porque no se
 * confía en nada de lo que entra por la red; lo que sale del servidor son tipos de
 * TypeScript nada más, porque el emisor es el dueño del estado.
 */

import { z } from 'zod';
import type { JugadorId, SalaId } from './ids.js';
import type { VistaJugador, VistaTV } from './vistas.js';

/**
 * Se sube cuando un cliente viejo deja de funcionar contra un servidor nuevo:
 * un mensaje que se va, un campo obligatorio que aparece, una `Accion` que
 * cambia de forma. No hace falta subirla para agregar campos opcionales.
 *
 * El cliente compara contra la `version` de `bienvenida` y, si no coincide, se
 * recarga solo (`conexion.ts`). Sin eso, un celular con la página abierta
 * durante un deploy reconecta el socket con el JS viejo en memoria y queda en
 * una pantalla muda: el socket anda, el servidor es nuevo, el cliente no
 * entiende lo que le llega y no hay ningún error visible.
 *
 * 2 — D18/D19: se fue `elegir_esfuerzo` y la boleta perdió `esfuerzo`; llegó
 *     `asignar_esfuerzo` y la acción `repartir_esfuerzo`.
 * 3 — A2: llegó `mandar_perro_a_explorar` y la acción `mandar_perro`.
 * 4 — D24: el juego pasó a ser "sigo o me vuelvo". `elegir` lleva `opcion`;
 *     se fueron la boleta, el esfuerzo, el perro explorador, el trato y los
 *     objetos; llegaron `revancha` y `en_espera`.
 */
export const VERSION_PROTOCOLO = 4;

/**
 * Cada cuánto manda `ping` cada cliente. Cloudflare (y casi todo proxy) corta un
 * WebSocket sin tráfico a los ~100 segundos. En la partida no pasa —hay mensajes
 * todo el tiempo—, pero la sala esperando gente o la pantalla final pueden estar
 * minutos en silencio, y si la TV se corta abre otra sala con otro código.
 */
export const INTERVALO_PING_MS = 25_000;

/* ------------------------------------------------------------------ */
/* cliente → servidor                                                  */
/* ------------------------------------------------------------------ */

export const MensajeEntranteSchema = z.discriminatedUnion('t', [
  /** Un celular entra a la sala. Sin `sesion` es alguien nuevo; con `sesion`, vuelve. */
  z.object({
    t: z.literal('unirse'),
    sala: z.string().length(4),
    nombre: z.string().min(1).max(16),
    sesion: z.string().uuid().optional(),
  }),
  /** La TV abre la sala y queda suscrita. Es el único cliente que puede crearla. */
  z.object({ t: z.literal('abrir_sala'), tablero: z.string().optional() }),
  z.object({ t: z.literal('votar_tablero'), tablero: z.string() }),
  z.object({ t: z.literal('listo'), listo: z.boolean() }),
  /** Sigo o me vuelvo. Un toque y queda: no se cambia. */
  z.object({ t: z.literal('elegir'), opcion: z.enum(['sigo', 'vuelvo']) }),
  /** Desde el final: otra partida con la misma mesa. */
  z.object({ t: z.literal('revancha') }),
  z.object({ t: z.literal('quitar_jugador'), jugador: z.string() }),
  z.object({ t: z.literal('ping') }),
]);

export type MensajeEntrante = z.infer<typeof MensajeEntranteSchema>;

/* ------------------------------------------------------------------ */
/* servidor → cliente                                                  */
/* ------------------------------------------------------------------ */

export type MensajeSaliente =
  /** Primer mensaje de toda conexión. Trae el token con el que se reconecta. */
  | { t: 'bienvenida'; version: number; sala: SalaId; jugador?: JugadorId; sesion?: string }
  | {
      t: 'sala';
      codigo: SalaId;
      jugadores: { id: JugadorId; nombre: string; listo: boolean }[];
      cuentaRegresiva?: number;
      /** Tableros disponibles para votar. Autocontenido: el cliente no hardcodea la lista. */
      tableros: { id: string; nombre: string }[];
      /** Un voto por jugador, si ya votó. */
      votos: Record<JugadorId, string>;
    }
  /** Estado completo. Se manda entero en cada transición: no hay parches (D4). */
  | { t: 'tv'; vista: VistaTV }
  | { t: 'jugador'; vista: VistaJugador }
  /** Entraste con la partida andando: jugás desde la revancha. */
  | { t: 'en_espera' }
  | { t: 'error'; codigo: CodigoError; mensaje: string }
  | { t: 'pong' };

export type CodigoError =
  | 'sala_inexistente'
  | 'sala_llena'
  | 'sesion_invalida'
  | 'fuera_de_fase'
  | 'jugada_invalida'
  | 'mensaje_ilegible';

/** Marca de "ya me recargué por esto", para no entrar en un loop de recargas. */
export const CLAVE_REINTENTO_VERSION = 'salvese.recargado-por-version';

/**
 * Qué hacer cuando llega la `bienvenida`: seguir, recargarse para bajar el
 * cliente nuevo, o rendirse y avisarle a la persona.
 *
 * Recargar alcanza porque el servidor manda `index.html` con `no-cache` y los
 * assets de Vite llevan hash (`estaticos.ts`): un reload común ya baja el
 * bundle nuevo. Se intenta **una sola vez** — si después de recargar la versión
 * sigue sin coincidir, el problema no es el caché y recargar en loop solo
 * esconde el error.
 *
 * Vive acá y no en cada cliente para que la TV y el celular no puedan
 * discrepar sobre qué versión es compatible.
 */
export function decidirPorVersion(
  versionServidor: number,
  yaSeRecargo: boolean,
): 'seguir' | 'recargar' | 'rendirse' {
  if (versionServidor === VERSION_PROTOCOLO) return 'seguir';
  return yaSeRecargo ? 'rendirse' : 'recargar';
}

/** Parseo defensivo: nunca lanza, devuelve el error como valor. */
export function leerEntrante(
  crudo: unknown,
): { ok: true; mensaje: MensajeEntrante } | { ok: false; codigo: CodigoError } {
  const texto = typeof crudo === 'string' ? crudo : null;
  if (texto === null) return { ok: false, codigo: 'mensaje_ilegible' };

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, codigo: 'mensaje_ilegible' };
  }

  const parsed = MensajeEntranteSchema.safeParse(json);
  if (!parsed.success) return { ok: false, codigo: 'jugada_invalida' };
  return { ok: true, mensaje: parsed.data };
}
