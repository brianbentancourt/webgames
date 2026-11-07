/**
 * Números del juego. Todo lo que se calibra jugando vive acá y en los tableros.
 */

export const LIMITES = {
  jugadoresMin: 2,
  jugadoresMax: 10,
} as const;

/**
 * Cuánto dura cada fase. El ritmo es el juego: una vuelta (carta + decisión +
 * retirada) tiene que entrar en ~20 segundos para que nadie agarre el celular
 * para otra cosa.
 */
export const TIEMPOS = {
  /** "Noche 2 de 5". Lo justo para que se acomoden. */
  presentacionMs: 4_500,
  /** Sale un hallazgo: se ve cuánto toca a cada uno. */
  hallazgoMs: 2_800,
  /** Sale el primer peligro de un tipo: el susto tiene que respirar. */
  sustoMs: 4_000,
  /**
   * La ventana para elegir. Se cierra antes si ya eligieron todos, así que en
   * la práctica dura lo que tarda el más indeciso — y la mesa se lo hace saber.
   */
  decidirMs: 15_000,
  /** Se revela quién se vuelve. Es el momento de los gritos. */
  retiradaMs: 4_500,
  /** El segundo peligro igual. La cutscene de la noche. */
  emboscadaMs: 6_500,
  /** El balance de la noche, antes de la siguiente. */
  finNocheMs: 9_000,
} as const;

/**
 * El perro olfatea la próxima carta y reacciona en público. Acierta casi
 * siempre, nunca siempre: un oráculo mata la discusión; un perro que a veces
 * se equivoca la arranca.
 *
 * Cada fila suma 1: probabilidad de tranquilo, inquieto y gruñe según lo que
 * viene de verdad.
 */
export const PERRO = {
  /** Viene un peligro que ya está en el camino: la noche se termina. */
  letal: { tranquilo: 0.1, inquieto: 0.15, grune: 0.75 },
  /** Viene un peligro nuevo: susto, no golpe. */
  peligro: { tranquilo: 0.3, inquieto: 0.5, grune: 0.2 },
  /** Viene plata. */
  hallazgo: { tranquilo: 0.7, inquieto: 0.2, grune: 0.1 },
} as const;
