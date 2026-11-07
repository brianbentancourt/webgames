/**
 * El estado completo de una partida. Lo tiene solo el servidor; los clientes
 * reciben proyecciones (vistas.ts).
 *
 * El juego, en una línea: cada noche la caravana se mete en la sierra, la TV da
 * vuelta tramos y, después de cada uno, todos eligen a la vez si siguen o se
 * vuelven al campamento con lo que cargan. El segundo peligro igual se lleva
 * todo lo que tienen encima los que siguen en el camino.
 */

import type { JugadorId } from './ids.js';

/* ------------------------------------------------------------------ */
/* Tablero: lo que el core necesita saber de un escenario              */
/* ------------------------------------------------------------------ */

export interface PeligroDato {
  /** Clave estable: dos cartas son "el mismo peligro" si comparten tipo. */
  tipo: string;
  /** Se lee en la TV: "el puma". */
  nombre: string;
  icono: string;
  /** La primera vez que aparece: aviso, no golpe. */
  susto: string;
  /** La segunda: se lleva todo lo que cargan los que siguen. */
  golpe: string;
}

export interface HallazgoDato {
  valor: number;
  nombre: string;
}

export interface Paleta {
  cielo: string;
  cerroLejano: string;
  cerroMedio: string;
  cerroCercano: string;
  brasa: string;
}

export interface TableroDato {
  id: string;
  nombre: string;
  /** Una línea: qué cambia este tablero respecto del base. */
  regla: string;
  noches: number;
  /** Cómo se llama lo que se junta: "plata", "agua". */
  tesoro: string;
  paleta: Paleta;
  /** Archivos de `tv/public/fondos`, sin extensión. */
  fondos: { camino: string; campamento: string; final: string };
  hallazgos: HallazgoDato[];
  peligros: PeligroDato[];
  /** Cuántas cartas de cada peligro hay en el mazo al empezar. */
  copiasPorPeligro: number;
}

/* ------------------------------------------------------------------ */
/* Cartas                                                              */
/* ------------------------------------------------------------------ */

export type Carta =
  | { id: string; t: 'hallazgo'; valor: number; nombre: string }
  | { id: string; t: 'peligro'; tipo: string };

export interface CartaEnCamino {
  carta: Carta;
  /** Lo que no se pudo repartir parejo y quedó tirado en este tramo. */
  resto: number;
}

/* ------------------------------------------------------------------ */
/* Jugadores                                                           */
/* ------------------------------------------------------------------ */

export type Eleccion = 'sigo' | 'vuelvo';

/** Dónde está cada uno durante la noche. */
export type Lugar = 'camino' | 'campamento' | 'atrapado';

/** Lo que alimenta los premios del final. Conducta, no puntaje. */
export interface Estadisticas {
  vecesAtrapado: number;
  perdidoMax: number;
  perdidoTotal: number;
  /** Veces que volvió solo y se llevó lo tirado sin repartir. */
  volvioSolo: number;
  /** Noches en las que fue de los primeros en volverse. */
  primeroEnVolver: number;
  /** Noches en las que fue el último en el camino y se salvó. */
  ultimoEnVolver: number;
}

export interface Jugador {
  id: JugadorId;
  nombre: string;
  /** Lo guardado. No se pierde nunca. Secreto hasta el final. */
  baul: number;
  /** Lo que lleva encima esta noche. Público. Se pierde si lo agarran. */
  mochila: number;
  lugar: Lugar;
  /** Solo durante `decidir`. `null` = todavía no eligió. */
  eleccion: Eleccion | null;
  /** Lo que pasó esta noche, para el balance. */
  ganadoNoche: number;
  perdidoNoche: number;
  stats: Estadisticas;
}

/* ------------------------------------------------------------------ */
/* Partida                                                             */
/* ------------------------------------------------------------------ */

export type Fase =
  | 'presentacion'
  | 'revelar'
  | 'decidir'
  | 'retirada'
  | 'emboscada'
  | 'fin_noche'
  | 'final';

export type AvisoPerro = 'tranquilo' | 'inquieto' | 'grune';

export interface Retirada {
  volvieron: JugadorId[];
  siguieron: JugadorId[];
  /** No eligieron a tiempo: siguen por defecto, y la TV lo dice. */
  callados: JugadorId[];
  /** Lo tirado en el camino que se llevó cada uno de los que volvieron. */
  cadaUno: number;
}

export interface Emboscada {
  tipo: string;
  perdieron: { jugador: JugadorId; cuanto: number }[];
}

export type FinDeNoche = 'todos_volvieron' | 'emboscada' | 'sin_cartas';

export interface ResumenNoche {
  noche: number;
  motivo: FinDeNoche;
  /** Tipo del peligro que terminó la noche, si fue una emboscada. */
  tipo?: string;
  tramos: number;
  filas: { jugador: JugadorId; ganado: number; perdido: number }[];
}

export interface EstadoPartida {
  tablero: TableroDato;
  semilla: string;
  /** Cuántas revanchas van. Entra en la semilla: la revancha no repite mazo. */
  ronda: number;
  noche: number;
  fase: Fase;
  /**
   * Sube en cada transición. Los clientes lo usan como llave para animar: el
   * gatillo es un paso nuevo, nunca una comparación entre estados (D4).
   */
  paso: number;
  jugadores: Jugador[];
  /** Lo que falta dar vuelta esta noche, en orden. */
  mazo: Carta[];
  /** Lo que ya se dio vuelta esta noche. */
  camino: CartaEnCamino[];
  /** Copias de cada peligro sacadas del juego por emboscadas anteriores. */
  quitados: Record<string, number>;
  /** Reacción pública del perro a la próxima carta. Solo durante `decidir`. */
  perro: AvisoPerro | null;
  retirada: Retirada | null;
  emboscada: Emboscada | null;
  historial: ResumenNoche[];
}
