/**
 * Un tablero es un paquete de datos, no una pantalla nueva.
 *
 * Cada tablero cambia una regla, no solo la piel (D12): por eso `regla` no es
 * opcional. Hoy lo que se puede cambiar es el mazo (cuántas copias de cada
 * peligro, cuánto vale cada hallazgo) y cuántas noches dura.
 */

import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color hex de 6 dígitos');

export const PaletaSchema = z.object({
  cielo: color,
  cerroLejano: color,
  cerroMedio: color,
  cerroCercano: color,
  brasa: color,
});

export const PeligroSchema = z.object({
  tipo: z.string().regex(/^[a-z-]+$/),
  nombre: z.string().max(24),
  icono: z.string().min(1).max(8),
  /** Se lee de reojo: una frase corta. */
  susto: z.string().max(80),
  golpe: z.string().max(80),
});

export const HallazgoSchema = z.object({
  valor: z.number().int().min(1).max(30),
  nombre: z.string().max(40),
});

export const TableroSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  regla: z.string().min(1).max(90),
  noches: z.number().int().min(3).max(7),
  tesoro: z.string().max(12),
  paleta: PaletaSchema,
  fondos: z.object({ camino: z.string(), campamento: z.string(), final: z.string() }),
  hallazgos: z.array(HallazgoSchema).min(10),
  // Cinco tipos: con menos, el segundo igual sale demasiado rápido; con más,
  // casi nunca y no hay miedo.
  peligros: z
    .array(PeligroSchema)
    .length(5)
    .refine((ps) => new Set(ps.map((p) => p.tipo)).size === ps.length, 'tipos de peligro repetidos'),
  copiasPorPeligro: z.number().int().min(2).max(5),
});

/** Estructuralmente igual a `TableroDato` del core: el servidor se lo pasa tal cual. */
export type Tablero = z.infer<typeof TableroSchema>;
