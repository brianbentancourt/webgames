/**
 * El cierre: quién juntó más y los apodos que cada uno se ganó.
 *
 * Los premios salen de la conducta, no de un texto escrito: un apodo que te
 * ganaste delante de todos es diez veces más gracioso que uno que te pusieron.
 */

import type { EstadoPartida, Estadisticas, Jugador } from './estado.js';
import type { JugadorId } from './ids.js';

export interface Puesto {
  jugador: JugadorId;
  nombre: string;
  baul: number;
  /** 1 es el que ganó. Los empates comparten puesto. */
  puesto: number;
}

export function ranking(estado: EstadoPartida): Puesto[] {
  const orden = [...estado.jugadores].sort((a, b) => b.baul - a.baul);
  const puestos: Puesto[] = [];
  orden.forEach((j, i) => {
    const anterior = puestos[i - 1];
    const puesto = anterior !== undefined && anterior.baul === j.baul ? anterior.puesto : i + 1;
    puestos.push({ jugador: j.id, nombre: j.nombre, baul: j.baul, puesto });
  });
  return puestos;
}

export interface Premio {
  titulo: string;
  /** Uno, o varios si empataron en la punta. */
  jugadores: JugadorId[];
  /** Listo para leer: "Beto" o "Beto y Emi". */
  nombre: string;
  detalle: string;
}

interface Regla {
  titulo: string;
  medida: (s: Estadisticas) => number;
  detalle: (n: number, tesoro: string) => string;
}

const veces = (n: number) => (n === 1 ? 'una vez' : `${n} veces`);
const noches = (n: number) => (n === 1 ? 'una noche' : `${n} noches`);

const REGLAS: Regla[] = [
  {
    titulo: 'El codicioso',
    medida: (s) => s.perdidoMax,
    detalle: (n, tesoro) => `perdió ${n} de ${tesoro} de una sola vez`,
  },
  {
    titulo: 'El vivo',
    medida: (s) => s.volvioSolo,
    detalle: (n) => `se volvió solo ${veces(n)} y se llevó lo tirado sin repartir`,
  },
  {
    titulo: 'El gallina',
    medida: (s) => s.primeroEnVolver,
    detalle: (n) => `fue el primero en pegar la vuelta ${noches(n)}`,
  },
  {
    titulo: 'El temerario',
    medida: (s) => s.vecesAtrapado,
    detalle: (n) => `lo agarraron ${noches(n)}`,
  },
  {
    titulo: 'El último en irse',
    medida: (s) => s.ultimoEnVolver,
    detalle: (n) => `se quedó hasta el final y volvió entero ${veces(n)}`,
  },
];

/**
 * Un premio por regla, al que más hizo eso, si alguien lo hizo al menos una vez.
 * Los empates en la punta lo comparten ("Beto y Emi": dos que se hicieron agarrar
 * cinco noches seguidas es más gracioso que uno). Si empata toda la mesa no hay
 * premio: no distingue a nadie.
 */
export function premios(estado: EstadoPartida): Premio[] {
  const lista: Premio[] = [];
  for (const regla of REGLAS) {
    const medidos = estado.jugadores.map((j): [Jugador, number] => [j, regla.medida(j.stats)]);
    const max = Math.max(...medidos.map(([, n]) => n));
    if (max <= 0) continue;
    const punta = medidos.filter(([, n]) => n === max).map(([j]) => j);
    if (punta.length === estado.jugadores.length && punta.length > 1) continue;
    const nombres = punta.map((j) => j.nombre);
    lista.push({
      titulo: regla.titulo,
      jugadores: punta.map((j) => j.id),
      nombre: nombres.length === 1 ? nombres[0]! : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`,
      detalle: regla.detalle(max, estado.tablero.tesoro),
    });
  }
  return lista;
}
