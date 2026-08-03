/**
 * Un tablero es un paquete de datos, no una pantalla nueva.
 *
 * La regla que sostiene esto: cada tablero cambia una regla, no solo la piel (D12).
 * Por eso `regla` no es opcional y por eso el schema valida que exista.
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

/** Silueta de cerro: puntos normalizados 0..1 que la TV escala al ancho de pantalla. */
export const CerroSchema = z.object({
  profundidad: z.enum(['lejano', 'medio', 'cercano']),
  puntos: z.array(z.tuple([z.number(), z.number()])).min(3),
});

export const TramoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  dureza: z.number().int().min(0).max(3),
  /** Negativo repone: un tramo que da de comer o que tiene agua. */
  costoRecurso: z.number().int().min(-3).max(3),
  hallazgo: z.number().min(0).max(1),
  /** Lo público. Dos palabras, sin números: se mira de reojo, no se lee. */
  pista: z.string().max(28),
  /** Lo que ve el Baqueano y nadie más. */
  terreno: z.string().max(120),
});

export const ArquetipoObjetoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  clase: z.enum(['redistribuye', 'no_identificado', 'pesa', 'dano_diferido', 'de_bolsillo']),
  /** Efecto mecánico duro. El modelo elige del mazo y escribe la piel, no lo inventa. */
  efecto: z.string(),
  usos: z.number().int().min(1).max(5),
});

export const ObjetivoSchema = z.object({
  id: z.string(),
  /** Se revela en el epílogo y reinterpreta la partida entera. */
  texto: z.string(),
  /** Condición mecánica que el motor evalúa. Nunca la evalúa el modelo. */
  condicion: z.string(),
});

export const TableroSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  noches: z.number().int().min(3).max(7),
  distancia: z.number().int().min(1),
  recursoCritico: z.object({
    id: z.string(),
    nombre: z.string(),
    inicial: z.number().int().min(0),
    capacidad: z.number().int().min(1),
  }),
  /** Una línea: qué regla rompe este tablero respecto de La Sierra. */
  regla: z.string().min(10),
  paleta: PaletaSchema,
  cerros: z.array(CerroSchema).min(3),
  tramos: z.array(TramoSchema).min(6),
  mazoObjetos: z.array(ArquetipoObjetoSchema).min(4),
  objetivos: z.array(ObjetivoSchema).min(5),
  /** Registro del relato que se le pasa al modelo como `voz`. */
  vozDelCamino: z.string().min(20),
  /** Nombres de la librería propia de fondos. Nada de generar imágenes en vivo. */
  fondos: z.array(z.string()).min(1),
  /** Texto de respaldo por escena, para cuando el modelo no llega a tiempo (D6). */
  respaldos: z.record(z.string(), z.array(z.string()).min(1)),
});

export type Tablero = z.infer<typeof TableroSchema>;
export type Paleta = z.infer<typeof PaletaSchema>;
export type TramoDato = z.infer<typeof TramoSchema>;
export type ArquetipoObjeto = z.infer<typeof ArquetipoObjetoSchema>;
