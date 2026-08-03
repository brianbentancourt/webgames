/**
 * Conexión del celular.
 *
 * El token de sesión se guarda en localStorage: si a alguien se le bloquea el
 * teléfono en la noche 3 tiene que volver a su asiento sin que la mesa lo espere.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MensajeEntrante, MensajeSaliente } from '@travesia/core';

export const URL_SERVIDOR: string =
  import.meta.env['VITE_SERVIDOR'] ??
  (import.meta.env.DEV
    ? // Mismo host que sirvió la página, otro puerto. Es lo que hace que los
      // celulares entren por la IP de la laptop sin configurar nada.
      `ws://${location.hostname}:8787/ws`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

const CLAVE_SESION = 'travesia.sesion';

export function useConexion() {
  const [estado, setEstado] = useState<'conectando' | 'abierta' | 'cerrada'>('conectando');
  const [ultimo, setUltimo] = useState<MensajeSaliente | null>(null);
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
          if (msg.sesion !== undefined) {
            localStorage.setItem(CLAVE_SESION, msg.sesion);
          }
          localStorage.setItem('travesia.sala', msg.sala);
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

  return { estado, ultimo, mandar, sesionGuardada: () => localStorage.getItem(CLAVE_SESION) };
}
