/**
 * Conexión de la TV. Un socket, reconexión con backoff y nada más.
 *
 * No guarda estado de juego: lo que llega se pinta. Si se corta y vuelve, llega el
 * estado completo otra vez y se repinta (D4).
 */

import { useEffect, useRef, useState } from 'react';
import type { MensajeEntrante, MensajeSaliente } from '@salvese/core';
import { decidirPorVersion, CLAVE_REINTENTO_VERSION, INTERVALO_PING_MS } from '@salvese/core';

export const URL_SERVIDOR: string =
  import.meta.env['VITE_SERVIDOR'] ??
  (import.meta.env.DEV
    ? // En desarrollo el servidor está en otro puerto, pero en el MISMO host: si
      // acá dijera "localhost", un celular entrando por la IP de la laptop
      // buscaría el servidor dentro del propio teléfono.
      `ws://${location.hostname}:8787/ws`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

export function useConexion() {
  const [estado, setEstado] = useState<'conectando' | 'abierta' | 'cerrada'>('conectando');
  const [ultimo, setUltimo] = useState<MensajeSaliente | null>(null);
  /** El servidor habla otra versión y recargarse no alcanzó. */
  const [desactualizado, setDesactualizado] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    let vivo = true;
    let intento = 0;
    let temporizador: ReturnType<typeof setTimeout>;
    /** El latido que mantiene vivo el socket a través del proxy. */
    let latido: ReturnType<typeof setInterval> | undefined;

    const conectar = () => {
      if (!vivo) return;
      setEstado('conectando');
      const ws = new WebSocket(URL_SERVIDOR);
      socket.current = ws;

      ws.onopen = () => {
        clearInterval(latido);
        latido = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping' } satisfies MensajeEntrante));
        }, INTERVALO_PING_MS);
        intento = 0;
        setEstado('abierta');
        ws.send(JSON.stringify({ t: 'abrir_sala' } satisfies MensajeEntrante));
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as MensajeSaliente;
        // El pong solo confirma que el socket vive: no cambia nada que pintar.
        if (msg.t === 'pong') return;
        if (msg.t === 'bienvenida') {
          // La TV se queda prendida horas: es la que más probabilidad tiene de
          // atravesar un deploy con el JS viejo en memoria (ver protocolo.ts).
          const decision = decidirPorVersion(
            msg.version,
            sessionStorage.getItem(CLAVE_REINTENTO_VERSION) === '1',
          );
          if (decision === 'recargar') {
            sessionStorage.setItem(CLAVE_REINTENTO_VERSION, '1');
            location.reload();
            return;
          }
          if (decision === 'rendirse') {
            vivo = false;
            setDesactualizado(true);
            ws.close();
            return;
          }
          sessionStorage.removeItem(CLAVE_REINTENTO_VERSION);
        }
        setUltimo(msg);
      };
      ws.onclose = () => {
        clearInterval(latido);
        setEstado('cerrada');
        if (!vivo) return;
        const espera = Math.min(1000 * 2 ** intento++, 8000);
        temporizador = setTimeout(conectar, espera);
      };
    };

    conectar();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      clearInterval(latido);
      socket.current?.close();
    };
  }, []);

  const mandar = (mensaje: MensajeEntrante) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(mensaje));
  };

  return { estado, ultimo, mandar, desactualizado };
}
