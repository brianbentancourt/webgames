/**
 * Conexión del celular.
 *
 * El token de sesión se guarda en localStorage: si a alguien se le bloquea el
 * teléfono en la noche 3 tiene que volver a su asiento sin que la mesa lo espere.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MensajeEntrante, MensajeSaliente } from '@salvese/core';
import { decidirPorVersion, CLAVE_REINTENTO_VERSION } from '@salvese/core';

export const URL_SERVIDOR: string =
  import.meta.env['VITE_SERVIDOR'] ??
  (import.meta.env.DEV
    ? // Mismo host que sirvió la página, otro puerto. Es lo que hace que los
      // celulares entren por la IP de la laptop sin configurar nada.
      `ws://${location.hostname}:8787/ws`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

const CLAVE_SESION = 'salvese.sesion';

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

    const conectar = () => {
      if (!vivo) return;
      setEstado('conectando');
      const ws = new WebSocket(URL_SERVIDOR);
      socket.current = ws;
      ws.onopen = () => {
        intento = 0;
        setEstado('abierta');
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as MensajeSaliente;
        if (msg.t === 'bienvenida') {
          // Un deploy a mitad de partida deja el celular con el JS viejo en
          // memoria: el socket reconecta solo, el servidor ya es nuevo, y sin
          // esto la pantalla queda muda sin ningún error visible.
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

          if (msg.sesion !== undefined) {
            localStorage.setItem(CLAVE_SESION, msg.sesion);
          }
          localStorage.setItem('salvese.sala', msg.sala);
        }
        setUltimo(msg);
      };
      ws.onclose = () => {
        setEstado('cerrada');
        if (!vivo) return;
        temporizador = setTimeout(conectar, Math.min(1000 * 2 ** intento++, 8000));
      };
    };

    conectar();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      socket.current?.close();
    };
  }, []);

  const mandar = useCallback((mensaje: MensajeEntrante) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(mensaje));
  }, []);

  return {
    estado,
    ultimo,
    mandar,
    desactualizado,
    sesionGuardada: () => localStorage.getItem(CLAVE_SESION),
  };
}
