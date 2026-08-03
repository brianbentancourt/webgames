import { laSierra } from './la-sierra.js';
import { elSalitral } from './el-salitral.js';
import { TableroSchema, type Tablero } from './schema.js';
import { registrarTablero } from '@travesia/core';

export * from './schema.js';
export { laSierra, elSalitral };

registrarTablero('la-sierra', laSierra as any);
registrarTablero('el-salitral', elSalitral as any);

/** El primero viene abierto, el resto se desbloquea al terminar una travesía. */
export const TABLEROS: readonly Tablero[] = [laSierra, elSalitral];

export function obtenerTablero(id: string): Tablero | undefined {
  return TABLEROS.find((t) => t.id === id);
}

/**
 * Valida todos los tableros contra el schema. La corre el arranque del servidor y
 * el test: un tablero mal formado tiene que romper acá y no en la noche 3 de una
 * partida con gente en el living.
 */
export function validarTableros(): void {
  for (const tablero of TABLEROS) {
    const r = TableroSchema.safeParse(tablero);
    if (!r.success) {
      throw new Error(`tablero "${tablero.id}" inválido: ${r.error.issues[0]?.message ?? ''}`);
    }
  }
}
