/**
 * Lo que ve cada pantalla. El servidor proyecta el estado y manda la vista
 * entera en cada transición; los clientes pintan y no calculan reglas (D4).
 *
 * Qué es público y qué no:
 *  - la mochila de cada uno es pública: es lo que se arriesga, y la mesa tiene
 *    que poder decirle a alguien "¡estás cargando 14, volvete!".
 *  - el baúl es secreto hasta el final: nadie sabe con certeza quién va ganando,
 *    y eso es lo que hace que "yo voy re atrás, tengo que seguir" sea un bluff.
 *  - lo que eligió cada uno es secreto hasta la retirada, y ahí se ve todo junto.
 */

import type {
  AvisoPerro,
  Eleccion,
  EstadoPartida,
  Fase,
  FinDeNoche,
  Lugar,
  Paleta,
} from './estado.js';
import type { JugadorId } from './ids.js';
import { premios, ranking, type Premio, type Puesto } from './premios.js';

/**
 * Un color por asiento, fijo toda la partida. Lo usan la TV (la silueta) y el
 * celular (tu ficha): que tu color en la mano sea el de tu figura en la tele es
 * lo que te hace encontrarte de un vistazo.
 */
export const COLORES_ASIENTO = [
  '#5a7b8c', '#8c5a5a', '#5a8c6b', '#826a8c', '#8c7c5a',
  '#5a5a8c', '#8c6a4a', '#4a8c8c', '#8c4a7a', '#6b8c4a',
] as const;

export const colorDeAsiento = (asiento: number) => COLORES_ASIENTO[asiento % COLORES_ASIENTO.length]!;

export interface Contexto {
  /** Milisegundos que le quedan a la fase en curso, si tiene reloj. */
  restanteMs: number | null;
  /** Quiénes tienen el celular conectado ahora. */
  conectados?: ReadonlySet<JugadorId>;
}

/* ------------------------------------------------------------------ */
/* TV                                                                  */
/* ------------------------------------------------------------------ */

export interface JugadorTV {
  id: JugadorId;
  nombre: string;
  /** Posición fija en la mesa: de acá sale el color de su silueta. */
  asiento: number;
  lugar: Lugar;
  mochila: number;
  /** Ya tocó algo. No dice qué. */
  eligio: boolean;
  /** Solo durante la retirada: ahí se revela todo junto. */
  eleccion: Eleccion | null;
  conectado: boolean;
}

export type CartaTV =
  | { id: string; t: 'hallazgo'; nombre: string; valor: number; resto: number }
  | { id: string; t: 'peligro'; tipo: string; nombre: string; icono: string; repetido: boolean };

export interface VistaTV {
  fase: Fase;
  paso: number;
  noche: number;
  nochesTotales: number;
  restanteMs: number | null;
  tablero: { nombre: string; regla: string; tesoro: string; paleta: Paleta; fondo: string };
  jugadores: JugadorTV[];
  camino: CartaTV[];
  /** Los peligros que ya salieron esta noche: si vuelve a salir uno, se terminó. */
  peligrosALaVista: { tipo: string; nombre: string; icono: string }[];
  /** Lo que quedó tirado en el camino, para los próximos que vuelvan. */
  tirado: number;
  perro: AvisoPerro | null;
  /** El texto de la última carta, si fue un peligro: susto o golpe. */
  relato: string | null;
  retirada: {
    volvieron: string[];
    siguieron: string[];
    callados: string[];
    cadaUno: number;
  } | null;
  emboscada: {
    nombre: string;
    icono: string;
    perdieron: { nombre: string; cuanto: number }[];
  } | null;
  resumenNoche: {
    noche: number;
    motivo: FinDeNoche;
    peligro: string | null;
    filas: { nombre: string; ganado: number; perdido: number }[];
  } | null;
  final: { ranking: Puesto[]; premios: Premio[] } | null;
}

export function proyectarTV(estado: EstadoPartida, ctx: Contexto): VistaTV {
  const { tablero } = estado;
  const peligro = (tipo: string) => tablero.peligros.find((p) => p.tipo === tipo);
  const nombreDe = (id: JugadorId) => estado.jugadores.find((j) => j.id === id)?.nombre ?? '?';

  const vistos = new Set<string>();
  const camino: CartaTV[] = estado.camino.map(({ carta, resto }) => {
    if (carta.t === 'hallazgo') {
      return { id: carta.id, t: 'hallazgo', nombre: carta.nombre, valor: carta.valor, resto };
    }
    const repetido = vistos.has(carta.tipo);
    vistos.add(carta.tipo);
    const p = peligro(carta.tipo);
    return {
      id: carta.id,
      t: 'peligro',
      tipo: carta.tipo,
      nombre: p?.nombre ?? carta.tipo,
      icono: p?.icono ?? '!',
      repetido,
    };
  });

  const ultima = estado.camino.at(-1)?.carta;
  let relato: string | null = null;
  if (ultima?.t === 'peligro' && (estado.fase === 'revelar' || estado.fase === 'emboscada')) {
    const p = peligro(ultima.tipo);
    relato = (estado.fase === 'emboscada' ? p?.golpe : p?.susto) ?? null;
  }

  const ultimoResumen = estado.historial.at(-1);
  const enFinal = estado.fase === 'final';

  return {
    fase: estado.fase,
    paso: estado.paso,
    noche: estado.noche,
    nochesTotales: tablero.noches,
    restanteMs: ctx.restanteMs,
    tablero: {
      nombre: tablero.nombre,
      regla: tablero.regla,
      tesoro: tablero.tesoro,
      paleta: tablero.paleta,
      fondo:
        enFinal ? tablero.fondos.final : estado.fase === 'fin_noche' ? tablero.fondos.campamento : tablero.fondos.camino,
    },
    jugadores: estado.jugadores.map((j, asiento) => ({
      id: j.id,
      nombre: j.nombre,
      asiento,
      lugar: j.lugar,
      mochila: j.mochila,
      eligio: estado.fase === 'decidir' && j.lugar === 'camino' && j.eleccion !== null,
      // Solo los que eligieron en esta vuelta: los que ya estaban en el
      // campamento de antes no "se vuelven" de nuevo.
      eleccion:
        estado.fase === 'retirada' &&
        estado.retirada !== null &&
        (estado.retirada.volvieron.includes(j.id) || estado.retirada.siguieron.includes(j.id))
          ? j.eleccion
          : null,
      conectado: ctx.conectados?.has(j.id) ?? true,
    })),
    camino,
    peligrosALaVista: [...vistos].map((tipo) => {
      const p = peligro(tipo);
      return { tipo, nombre: p?.nombre ?? tipo, icono: p?.icono ?? '!' };
    }),
    tirado: estado.camino.reduce((s, c) => s + c.resto, 0),
    perro: estado.perro,
    relato,
    retirada:
      estado.fase === 'retirada' && estado.retirada
        ? {
            volvieron: estado.retirada.volvieron.map(nombreDe),
            siguieron: estado.retirada.siguieron.map(nombreDe),
            callados: estado.retirada.callados.map(nombreDe),
            cadaUno: estado.retirada.cadaUno,
          }
        : null,
    emboscada:
      estado.fase === 'emboscada' && estado.emboscada
        ? {
            nombre: peligro(estado.emboscada.tipo)?.nombre ?? estado.emboscada.tipo,
            icono: peligro(estado.emboscada.tipo)?.icono ?? '!',
            perdieron: estado.emboscada.perdieron.map((p) => ({ nombre: nombreDe(p.jugador), cuanto: p.cuanto })),
          }
        : null,
    resumenNoche:
      estado.fase === 'fin_noche' && ultimoResumen
        ? {
            noche: ultimoResumen.noche,
            motivo: ultimoResumen.motivo,
            peligro: ultimoResumen.tipo ? (peligro(ultimoResumen.tipo)?.nombre ?? null) : null,
            filas: ultimoResumen.filas.map((f) => ({ nombre: nombreDe(f.jugador), ganado: f.ganado, perdido: f.perdido })),
          }
        : null,
    final: enFinal ? { ranking: ranking(estado), premios: premios(estado) } : null,
  };
}

/* ------------------------------------------------------------------ */
/* Celular                                                             */
/* ------------------------------------------------------------------ */

export interface VistaJugador {
  fase: Fase;
  paso: number;
  noche: number;
  nochesTotales: number;
  restanteMs: number | null;
  tesoro: string;
  yo: {
    id: JugadorId;
    nombre: string;
    /** Tu color: el mismo de tu silueta en la tele. */
    color: string;
    lugar: Lugar;
    mochila: number;
    baul: number;
    eleccion: Eleccion | null;
  };
  /** Hay que tocar algo ahora. */
  puedoElegir: boolean;
  /** Cuántos siguen en el camino además de mí. */
  compania: number;
  /** Lo tirado en el camino: si me vuelvo solo, es todo mío. */
  tirado: number;
  /** Si me acaban de agarrar, cuánto perdí. */
  perdi: number | null;
  /** El balance de la noche que terminó. */
  miNoche: { ganado: number; perdido: number } | null;
  final: { puesto: number; de: number; baul: number; premios: string[] } | null;
}

export function proyectarJugador(estado: EstadoPartida, id: JugadorId, ctx: Contexto): VistaJugador | null {
  const asiento = estado.jugadores.findIndex((j) => j.id === id);
  const yo = estado.jugadores[asiento];
  if (yo === undefined) return null;

  const fila = estado.historial.at(-1)?.filas.find((f) => f.jugador === id);
  let final: VistaJugador['final'] = null;
  if (estado.fase === 'final') {
    const puestos = ranking(estado);
    final = {
      puesto: puestos.find((p) => p.jugador === id)?.puesto ?? puestos.length,
      de: puestos.length,
      baul: yo.baul,
      premios: premios(estado)
        .filter((p) => p.jugadores.includes(id))
        .map((p) => p.titulo),
    };
  }

  return {
    fase: estado.fase,
    paso: estado.paso,
    noche: estado.noche,
    nochesTotales: estado.tablero.noches,
    restanteMs: ctx.restanteMs,
    tesoro: estado.tablero.tesoro,
    yo: {
      id: yo.id,
      nombre: yo.nombre,
      color: colorDeAsiento(asiento),
      lugar: yo.lugar,
      mochila: yo.mochila,
      baul: yo.baul,
      eleccion: estado.fase === 'decidir' || estado.fase === 'retirada' ? yo.eleccion : null,
    },
    puedoElegir: estado.fase === 'decidir' && yo.lugar === 'camino' && yo.eleccion === null,
    compania: estado.jugadores.filter((j) => j.lugar === 'camino' && j.id !== id).length,
    tirado: estado.camino.reduce((s, c) => s + c.resto, 0),
    perdi: yo.lugar === 'atrapado' && (estado.fase === 'emboscada' || estado.fase === 'fin_noche') ? yo.perdidoNoche : null,
    miNoche: estado.fase === 'fin_noche' && fila ? { ganado: fila.ganado, perdido: fila.perdido } : null,
    final,
  };
}
