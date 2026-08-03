/**
 * Todo el azar del juego pasa por acá.
 *
 * El motor es determinista: misma semilla + misma secuencia de comandos = misma
 * partida. Sin esto no hay tests de reglas reproducibles ni forma de reconstruir
 * una partida a partir del log. Nadie llama a Math.random() fuera de este archivo.
 */

export interface Rng {
  /** Flotante en [0, 1). */
  siguiente(): number;
  /** Entero en [min, max], ambos inclusive. */
  entero(min: number, max: number): number;
  /** Elige un elemento. Lanza si la lista está vacía. */
  elegir<T>(lista: readonly T[]): T;
  /** Copia barajada (Fisher-Yates). No muta la entrada. */
  barajar<T>(lista: readonly T[]): T[];
  /** true con probabilidad p. */
  suerte(p: number): boolean;
  /** Cuántas veces se consumió. Va en el log para poder rebobinar. */
  readonly consumos: number;
}

/** Hash de string a uint32, para aceptar semillas legibles ("sierra-2026"). */
export function semillaDesdeTexto(texto: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: chico, rápido y suficiente para un juego de mesa. */
export function crearRng(semilla: number | string): Rng {
  let estado = (typeof semilla === 'string' ? semillaDesdeTexto(semilla) : semilla) >>> 0;
  let consumos = 0;

  const siguiente = () => {
    consumos++;
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    siguiente,
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    elegir<T>(lista: readonly T[]): T {
      if (lista.length === 0) throw new Error('rng.elegir: lista vacía');
      return lista[Math.floor(siguiente() * lista.length)]!;
    },
    barajar<T>(lista: readonly T[]): T[] {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      }
      return copia;
    },
    suerte: (p) => siguiente() < p,
    get consumos() {
      return consumos;
    },
  };
}
