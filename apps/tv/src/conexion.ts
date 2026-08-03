/**
 * Conexión de la TV. Un socket, reconexión con backoff y nada más.
 *
 * No guarda estado de juego: lo que llega se pinta. Si se corta y vuelve, llega el
 * estado completo otra vez y se repinta (D4).
 */

import { useEffect, useRef, useState } from 'react';
import type { MensajeEntrante, MensajeSaliente } from '@travesia/core';

const URL_SERVIDOR = import.meta.env['VITE_SERVIDOR'] ?? 'ws://localhost:8787';

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
        ws.send(JSON.stringify({ t: 'abrir_sala' } satisfies MensajeEntrante));
      };
      ws.onmessage = (ev) => setUltimo(JSON.parse(ev.data as string) as MensajeSaliente);
      ws.onclose = () => {
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
      socket.current?.close();
    };
  }, []);

  return { estado, ultimo };
}
