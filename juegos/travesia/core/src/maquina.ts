/**
 * Máquina de estados del juego. Ver docs/specs/02-maquina-de-estados.md.
 *
 * Función pura: (estado, comando, rng, ahora) → (estado nuevo, efectos).
 * No abre sockets, no llama al modelo, no mira el reloj del sistema. Todo lo que
 * el mundo exterior tiene que hacer sale como `Efecto` y lo ejecuta el servidor.
 *
 * Esto es lo que permite jugar una partida entera en una terminal, que es el
 * próximo paso del proyecto: si el loop de una noche no es interesante sin UI,
 * no lo va a salvar ninguna animación.
 *
 * ESTADO: sin implementar. Las firmas y los tipos son el contrato; el cuerpo de
 * `reducir` es el trabajo del hito M1 (ver docs/specs/10-roadmap.md).
 */

import type { JugadorId, TableroId, TramoId } from './ids.js';
import type { EstadoPartida, NivelRaciones } from './estado.js';
import type { Escena, PedidoRelato, ResultadoRelato } from './llm.js';

export type Comando =
  | { t: 'crear'; tablero: TableroId; semilla: string }
  | { t: 'sumar_jugador'; jugador: JugadorId; nombre: string }
  | { t: 'quitar_jugador'; jugador: JugadorId }
  | { t: 'marcar_listo'; jugador: JugadorId; listo: boolean }
  | { t: 'empezar' }
  | {
      t: 'elegir';
      jugador: JugadorId;
      ruta?: TramoId;
      raciones?: NivelRaciones;
      esfuerzo?: JugadorId[];
    }
  | { t: 'bloquear'; jugador: JugadorId }
  | { t: 'responder_trato'; jugador: JugadorId; acepta: boolean }
  | { t: 'entregar_objeto'; de: JugadorId; a: JugadorId }
  /** Vence el reloj de la fase actual. Lo dispara el servidor, no un jugador. */
  | { t: 'vencio_fase' }
  /** Llegó (o no) el texto del modelo. La partida no espera por esto. */
  | { t: 'relato_listo'; escena: Escena; resultado: ResultadoRelato };

export type Efecto =
  /** Volver a llamar a `reducir` con `vencio_fase` dentro de N ms. */
  | { t: 'agendar'; enMs: number }
  /** Pedirle el texto al modelo. Se dispara al empezar la animación (D6). */
  | { t: 'pedir_relato'; pedido: PedidoRelato }
  /** Reproyectar y mandar vistas. El servidor decide a quién. */
  | { t: 'publicar'; a: 'todos' | 'tv' | { jugador: JugadorId } }
  | { t: 'terminar' };

export interface Transicion {
  estado: EstadoPartida;
  efectos: Efecto[];
}

/** Motivo por el que un comando no se aplica. Nunca se lanza: se devuelve. */
export type Rechazo = { motivo: 'fuera_de_fase' | 'jugada_invalida' | 'jugador_desconocido' };

export type Resultado = { ok: true; transicion: Transicion } | { ok: false } & Rechazo;

export function reducir(_estado: EstadoPartida, _comando: Comando): Resultado {
  throw new Error(
    'reducir(): sin implementar. Las reglas están escritas en docs/specs/03-reglas-de-resolucion.md',
  );
}
