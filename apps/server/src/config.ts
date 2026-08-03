import { z } from 'zod';

const Entorno = z.object({
  PUERTO: z.coerce.number().int().default(8787),
  /** Sin clave el servidor corre igual: todo relato sale del respaldo del tablero. */
  ANTHROPIC_API_KEY: z.string().optional(),
  MODELO: z.string().default('claude-haiku-4-5-20251001'),
});

export const config = Entorno.parse(process.env);
