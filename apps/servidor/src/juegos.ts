/**
 * El registro de juegos. Es la única lista: de acá salen las rutas que se montan,
 * el JSON que consume el menú y, cuando existan los motores, cuál se instancia
 * para cada sala.
 *
 * Agregar un juego es agregar una entrada acá y una carpeta en `/juegos`. Si
 * alguna vez hace falta tocar el servidor para que un juego funcione, la costura
 * está en el lugar equivocado.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { Montaje } from './estaticos.js';

export const raizRepo = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

export interface FichaJuego {
  /** Va en la URL: `/salvese`. */
  id: string;
  nombre: string;
  /** Una línea. Es lo que se lee en el menú, a tres metros o en la mano. */
  resumen: string;
  jugadores: string;
  minutos: number;
  /** `jugable` aparece en el menú; `en_obra` se muestra apagado y no se puede abrir. */
  estado: 'jugable' | 'en_obra';
  /** Carpeta del juego dentro de `/juegos`. */
  carpeta: string;
}

export const JUEGOS: readonly FichaJuego[] = [
  {
    id: 'salvese',
    nombre: 'Sálvese Quien Pueda',
    resumen: 'Una caravana cruza una sierra en cinco noches. Decisiones difíciles, secretos ocultos y el desafío de sobrevivir como grupo.',
    jugadores: '2 a 10',
    minutos: 25,
    estado: 'jugable',
    carpeta: 'salvese',
  },
];

/**
 * Rutas de estáticos. El menú va en la raíz; cada juego cuelga de su id, y su
 * cliente de celular de `/<id>/control`.
 */
export function montajes(): Montaje[] {
  const candidatos: Montaje[] = [{ prefijo: '/', raiz: resolve(raizRepo, 'apps/portal/dist') }];

  for (const juego of JUEGOS) {
    const base = resolve(raizRepo, 'juegos', juego.carpeta);
    candidatos.push(
      { prefijo: `/${juego.id}/`, raiz: resolve(base, 'tv/dist') },
      { prefijo: `/${juego.id}/control/`, raiz: resolve(base, 'control/dist') },
    );
  }

  // Sin builds no se monta nada: en desarrollo cada cliente lo sirve su propio Vite.
  return candidatos.filter((m) => existsSync(m.raiz));
}
