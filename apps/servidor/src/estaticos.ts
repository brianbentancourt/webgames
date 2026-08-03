/**
 * Sirve los bundles de tv y control desde el mismo proceso que el WebSocket.
 *
 * No es por rendimiento: es para que todo viva en un solo origen. Un origen
 * significa un hostname, un túnel, un certificado y cero CORS — y significa que
 * el celular no puede quedar apuntando a un servidor distinto del que sirvió la
 * página, que es el bug de deploy más aburrido de diagnosticar que existe.
 *
 * En desarrollo esto no corre: cada cliente lo sirve su propio Vite.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export interface Montaje {
  /** Prefijo de URL, con barra final salvo la raíz: '/' o '/control/'. */
  prefijo: string;
  /** Carpeta `dist` del cliente. */
  raiz: string;
}

export function crearEstaticos(montajes: Montaje[]) {
  const ordenados = [...montajes].sort((a, b) => b.prefijo.length - a.prefijo.length);

  return async function servir(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;

    const ruta = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const montaje = ordenados.find((m) => ruta === m.prefijo.slice(0, -1) || ruta.startsWith(m.prefijo));
    if (montaje === undefined) return false;

    const relativa = ruta.slice(montaje.prefijo.length) || 'index.html';
    const destino = resolve(montaje.raiz, relativa);

    // Un `..` en la URL no puede sacar el archivo de la carpeta del cliente.
    if (destino !== montaje.raiz && !destino.startsWith(montaje.raiz + sep)) {
      res.writeHead(403).end();
      return true;
    }

    const archivo = (await esArchivo(destino)) ? destino : join(montaje.raiz, 'index.html');
    if (!(await esArchivo(archivo))) return false;

    const esIndice = archivo.endsWith('index.html');
    res.writeHead(200, {
      'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      // Los assets de Vite llevan hash en el nombre; el índice nunca se cachea
      // porque es lo que decide qué versión del cliente corre.
      'cache-control': esIndice ? 'no-cache' : 'public, max-age=31536000, immutable',
    });

    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    createReadStream(archivo).pipe(res);
    return true;
  };
}

async function esArchivo(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}
