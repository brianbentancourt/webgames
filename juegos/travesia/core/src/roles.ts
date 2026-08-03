/**
 * Nombre lindo en la TV, nombre plano en el celular (diseno.md § Roles).
 * Nadie tiene que aprender vocabulario para jugar.
 */

export const ROLES = [
  'baqueano',
  'curandera',
  'despensero',
  'memorioso',
  'capataz',
  'pasajero',
] as const;

export type Rol = (typeof ROLES)[number];

/** Roles con habilidad de información. `pasajero` no está: tiene voto, no habilidad. */
export const ROLES_CON_HABILIDAD = ROLES.filter((r) => r !== 'pasajero') as readonly Rol[];

export interface FichaRol {
  /** Lo que se muestra en la TV. */
  readonly nombre: string;
  /** Lo que se muestra en el celular. Nunca la palabra del rol. */
  readonly llano: string;
  /** En qué noche se destraba la habilidad (curva de 5 noches, diseno.md). */
  readonly desbloqueo: 1 | 2 | 3;
}

export const FICHAS: Readonly<Record<Rol, FichaRol>> = {
  baqueano: { nombre: 'Baqueano', llano: 'el que ve el camino', desbloqueo: 1 },
  despensero: { nombre: 'Despensero', llano: 'el que cuenta la comida', desbloqueo: 2 },
  curandera: { nombre: 'Curandera', llano: 'la que ve a la gente', desbloqueo: 2 },
  memorioso: { nombre: 'Memorioso', llano: 'el que se acuerda', desbloqueo: 3 },
  capataz: { nombre: 'Capataz', llano: 'el que manda', desbloqueo: 1 },
  pasajero: { nombre: 'Pasajero', llano: 'el que va en la caravana', desbloqueo: 1 },
};

/**
 * Reparto por cantidad de jugadores (diseno.md § Escalado 2 → 10).
 * Cada entrada es la lista de asientos: dos asientos con el mismo rol son una
 * pareja que acuerda entre sí antes de hablarle al grupo.
 *
 * Con 2 jugadores la IA ocupa dos asientos; eso se resuelve en el servidor, no acá.
 */
export const REPARTO: Readonly<Record<number, readonly Rol[]>> = {
  2: ['baqueano', 'curandera'],
  3: ['baqueano', 'curandera', 'despensero'],
  4: ['baqueano', 'curandera', 'despensero', 'capataz'],
  5: ['baqueano', 'curandera', 'despensero', 'memorioso', 'capataz'],
  6: ['baqueano', 'baqueano', 'curandera', 'despensero', 'memorioso', 'capataz'],
  7: ['baqueano', 'baqueano', 'curandera', 'curandera', 'despensero', 'memorioso', 'capataz'],
  8: [
    'baqueano',
    'baqueano',
    'curandera',
    'curandera',
    'despensero',
    'despensero',
    'memorioso',
    'capataz',
  ],
  9: [
    'baqueano',
    'baqueano',
    'curandera',
    'curandera',
    'despensero',
    'despensero',
    'memorioso',
    'capataz',
    'pasajero',
  ],
  10: [
    'baqueano',
    'baqueano',
    'curandera',
    'curandera',
    'despensero',
    'despensero',
    'memorioso',
    'memorioso',
    'capataz',
    'pasajero',
  ],
};

/**
 * Con 3 jugadores el Capataz se fusiona en el Memorioso, que tampoco está en la
 * mesa: quien tiene el rol combinado manda y recuerda. Ver diseno.md § Escalado.
 */
export const FUSIONES: Readonly<Partial<Record<number, Readonly<Partial<Record<Rol, Rol>>>>>> = {
  3: { capataz: 'memorioso' },
};
