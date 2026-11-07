import { useEffect, useState } from 'react';

/**
 * Segundos que le quedan a la fase, contados en el reloj de la TV.
 *
 * El servidor manda cuánto falta (no a qué hora vence): así no importa si el
 * reloj del televisor está corrido. Se recalcula con cada vista nueva, que es
 * cada `paso`.
 */
export function useRestante(restanteMs: number | null, paso: number): number | null {
  const [vence, setVence] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    setVence(restanteMs === null ? null : Date.now() + restanteMs);
    // Solo cuando cambia el paso: una vista repetida del mismo paso (alguien
    // eligió) trae un restante apenas menor y no tiene que mover nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, restanteMs === null]);

  useEffect(() => {
    if (vence === null) return;
    const id = setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(id);
  }, [vence]);

  if (vence === null) return null;
  return Math.max(0, (vence - ahora) / 1000);
}
