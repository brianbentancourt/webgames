/**
 * El estado autoritativo de una partida. Vive en el servidor y nada más (D4).
 *
 * Los clientes nunca reciben este objeto: reciben vistas derivadas (ver vistas.ts).
 * Si un campo de acá llegara al celular, el juego de información oculta se termina.
 */

import type { JugadorId, ObjetivoId, ObjetoId, PartidaId, TableroId, TramoId } from './ids.js';
import type { Rol } from './roles.js';

export const FASES = ['lobby', 'reparto', 'acampar', 'decidir', 'resolver', 'fogon', 'epilogo'] as const;
export type Fase = (typeof FASES)[number];

export type Vigor = 0 | 1 | 2 | 3;

export interface Viajero {
  readonly id: JugadorId;
  nombre: string;
  rol: Rol;
  /** Asiento en el reparto. Dos asientos con el mismo rol son una pareja (6–10 jugadores). */
  asiento: number;
  /** El otro asiento del mismo rol, si lo hay. Acuerdan entre sí antes de hablarle al grupo. */
  parejaDe?: JugadorId;
  vigor: Vigor;
  /** Secreto. Se revela recién en el epílogo y reinterpreta la partida entera. */
  objetivo: ObjetivoId;
  /** Objeto que carga. Uno solo: los objetos se reparten, no se recogen (D11). */
  objeto?: ObjetoId;
  /** Un jugador desconectado sigue en la caravana; su boleta la completa el motor. */
  conectado: boolean;
  /** La habilidad de este rol está ciega esta noche (noches 3–4). */
  cegado: boolean;
  /** Aceptó el trato. Nunca lo hace perder: cambia el final y la crónica (D9). */
  aceptoElTrato: boolean;
  /** Solo se usa en `lobby`, antes de que el motor asigne roles con `empezar`. */
  listo?: boolean;
}

export interface EstadoPerro {
  presente: boolean;
  /** Lo único público del juego. Todos lo ven y cada uno lo interpreta distinto. */
  alerta: 'ninguna' | 'inquieto' | 'grune' | 'no_avanza';
  /** Secreto: si esta noche la alerta corresponde a lo que hay o no (D10). */
  dice_la_verdad: boolean;
}

export interface EstadoObjeto {
  readonly id: ObjetoId;
  /** Arquetipo del mazo del tablero. El efecto mecánico sale de acá, no del LLM. */
  arquetipo: string;
  portador?: JugadorId;
  /** Todos se degradan. A 0 se cae solo. */
  usosRestantes: number;
  /** Los "no identificados" no muestran su efecto hasta que se usan. */
  identificado: boolean;
}

/** Un tramo candidato de esta noche. El Baqueano ve el terreno de uno solo. */
export interface Tramo {
  readonly id: TramoId;
  nombre: string;
  /** Leguas que descuenta del avance. Oculto salvo para quien ve el terreno. */
  dureza: number;
  /** Modificador al consumo del recurso crítico. Oculto. */
  costoRecurso: number;
  /** Probabilidad de hallazgo de objeto. Oculto. */
  hallazgo: number;
  /** Lo que sí está a la vista de todos en la TV: dos palabras, nada de números. */
  pista: string;
}

export interface EstadoNoche {
  numero: number;
  /** Los tramos entre los que se elige esta noche. */
  candidatos: Tramo[];
  /** Boletas bloqueadas, por jugador. Secretas hasta que resuelve la noche. */
  boletas: Record<JugadorId, Boleta>;
  /** Marca de tiempo del servidor en la que vence la ventana de decisión. */
  venceEn: number;
}

/** Lo que un jugador bloqueó en su celular. Se discute en voz alta, se bloquea en secreto. */
export interface Boleta {
  ruta: TramoId;
  raciones: NivelRaciones;
  /** A quiénes manda al trabajo pesado. Puede ser a sí mismo. */
  esfuerzo: JugadorId[];
  bloqueadaEn: number;
}

export type NivelRaciones = 'ajustado' | 'normal' | 'abundante';

/** Lo que efectivamente se decidió, después de contar las boletas. */
export interface DecisionNoche {
  ruta: TramoId;
  raciones: NivelRaciones;
  esfuerzo: JugadorId[];
  /** Cómo se resolvió: sirve para la crónica y para explicar el resultado en la TV. */
  via: 'mayoria' | 'desempate_capataz' | 'capataz_solo' | 'oposicion_unanime' | 'vencio_el_tiempo';
}

/** Una línea de la crónica. Es el producto real de la partida: la anécdota. */
export interface EntradaCronica {
  noche: number;
  /** Hechos que produjo el motor. El texto se escribe sobre esto, nunca al revés. */
  hechos: string[];
  /** La piel que escribió el modelo, o el respaldo del tablero si no llegó a tiempo. */
  relato: string;
  origen: 'modelo' | 'respaldo';
}

export interface EstadoPartida {
  readonly id: PartidaId;
  readonly tablero: TableroId;
  readonly semilla: string;
  fase: Fase;
  noche: number;
  /** Cuántas noches tiene esta travesía. Sale del tablero. */
  nochesTotales: number;
  /** Leguas recorridas sobre el total del tablero. */
  avance: number;
  distanciaTotal: number;
  /** Recurso crítico del tablero: raciones en La Sierra, agua en El Salitral. */
  recurso: number;
  capacidad: number;
  viajeros: Viajero[];
  perro: EstadoPerro;
  objetos: EstadoObjeto[];
  nocheActual?: EstadoNoche;
  cronica: EntradaCronica[];
  /** A quién se le ofreció el trato esta travesía, si a alguien. */
  tratoOfrecidoA?: JugadorId;
  /** Se llena en el epílogo. */
  desenlace?: Desenlace;
}

export interface Desenlace {
  llegaron: boolean;
  /** Objetivos personales cumplidos. Se revela todo junto, al final. */
  objetivosCumplidos: JugadorId[];
  perroLlego: boolean;
}
