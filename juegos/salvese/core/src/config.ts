/**
 * Números del juego, en un solo lugar y a la vista.
 *
 * Todo lo de acá está sin calibrar: son los valores de arranque para que el motor
 * corra, no verdades de diseño. Se ajustan jugando. Lo que NO se cambia sin pasar
 * por decisiones.md son las formas: cinco noches, tres decisiones, 10 segundos de
 * celular por ronda.
 */

export const LIMITES = {
  jugadoresMin: 2,
  jugadoresMax: 10,
  objetosActivosMax: 4,
} as const;

/** Duración de cada fase, en milisegundos. La fogata es el reloj de `decidir`. */
export const TIEMPOS = {
  repartoMs: 8_000,
  acamparMs: 10_000,
  /** Ventana de discusión. Se acorta con la noche (ver `ventanaDecidirMs`). */
  decidirBaseMs: 90_000,
  /** Desde acá la TV muestra dígitos. Antes solo se ve la llama bajar. */
  decidirDigitosMs: 15_000,
  resolverMs: 7_000,
  fogonMs: 15_000,
  /** Pulso de un gatillo de alerta: objeto, quiebre o perro (08-cliente-tv.md). */
  alertaMs: 1_500,
  /** Presupuesto de la llamada al modelo dentro de la cutscene. Si vence, va el respaldo. */
  llmPresupuestoMs: 5_500,
} as const;

/** Noches 3 y 4 aprietan: el fuego se consume más rápido (diseno.md § Curva). */
export function ventanaDecidirMs(noche: number): number {
  const factor = noche <= 2 ? 1 : noche === 5 ? 0.6 : 0.75;
  return Math.round(TIEMPOS.decidirBaseMs * factor);
}

/** Vigor de un viajero. 0 es quebrado: no aporta esfuerzo y arrastra al grupo. */
export const VIGOR_MAX = 3;
export const VIGOR_INICIAL = 3;

export const RACIONES = {
  /** Consumo por viajero y por noche, según el nivel elegido. */
  consumoPorViajero: { ajustado: 1, normal: 2, abundante: 3 },
  /** Cambio de vigor que produce el nivel al final de la noche. */
  efectoVigor: { ajustado: -1, normal: 0, abundante: +1 },
} as const;

export const AVANCE = {
  /** Leguas que cubre la caravana sin esfuerzo extra. */
  base: 2,
  /** Leguas extra por viajero asignado al trabajo pesado. */
  porEsfuerzo: 1,
  /** Vigor que cuesta ser asignado al trabajo pesado. */
  costoEsfuerzoVigor: 1,
  /** Cuántos viajeros como máximo pueden ir al trabajo pesado en una noche. */
  esfuerzoMax: 3,
} as const;

/** El perro miente ~1 de cada 5 veces (D10). Deja de ser oráculo, pasa a ser discusión. */
export const PERRO_MIENTE = 0.2;

/** El trato se ofrece una vez por travesía, o a nadie (D9). Ventana de noches candidatas. */
export const TRATO = { nocheMin: 2, nocheMax: 4, probabilidadDeNoOfrecer: 0.25 } as const;
