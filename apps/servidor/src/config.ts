import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Una sola fuente de secretos locales: el .env de la raíz del repo (gitignorado),
// el mismo que ya lee docker-compose. Se resuelve por ruta de archivo, no por cwd,
// porque `pnpm --filter @juegos/servidor dev` corre con cwd en apps/servidor/.
// En deploy las variables ya vienen del entorno y este archivo no existe: no pasa nada.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // Sin .env: seguimos con lo que ya haya en process.env.
}

// docker-compose pasa `${VAR:-}` para variables sin setear: eso llega como string
// vacío, no como ausente. Sin este paso, un contenedor sin GROQ_API_KEY igual
// intentaría llamar a la API con una key vacía en cada resolución.
const vacioComoAusente = (v: unknown) => (v === '' ? undefined : v);

const Entorno = z.object({
  PUERTO: z.coerce.number().int().default(8787),
  /** Sin clave el servidor corre igual: todo relato sale del respaldo del tablero. */
  GROQ_API_KEY: z.preprocess(vacioComoAusente, z.string().optional()),
  /** El más rápido y barato de la familia (07-capa-llm.md § Costo y modelo). */
  MODELO: z.preprocess(vacioComoAusente, z.string().default('llama-3.1-8b-instant')),
});

export const config = Entorno.parse(process.env);
