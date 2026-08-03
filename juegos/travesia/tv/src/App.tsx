/**
 * Renderer tonto (D4). Recibe estado y pinta. No calcula reglas, no decide cuándo
 * animar: las animaciones se disparan por transición de estado.
 *
 * ESTADO: solo la pantalla de sala. Las escenas de fogata, avance y fogón entran
 * cuando el servidor mande vistas `tv` (ver docs/specs/08-cliente-tv.md).
 */

import { useEffect, useState } from 'react';
import { useConexion } from './conexion.js';

interface JugadorEnSala {
  id: string;
  nombre: string;
  listo: boolean;
}

export function App() {
  const { estado, ultimo } = useConexion();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<JugadorEnSala[]>([]);

  useEffect(() => {
    if (ultimo === null) return;
    if (ultimo.t === 'sala') {
      setCodigo(ultimo.codigo);
      setJugadores(ultimo.jugadores);
    }
  }, [ultimo]);

  if (estado !== 'abierta') {
    return (
      <main className="pantalla">
        <p className="al-pie">buscando el servidor…</p>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <section>
        <p className="al-pie">entrá desde el celular y poné este código</p>
        <p className="codigo brasa">{codigo ?? '····'}</p>
      </section>

      <ul className="viajeros">
        {jugadores.map((j) => (
          <li className="viajero" key={j.id} data-listo={j.listo}>
            <span>{j.nombre}</span>
            <span className="al-pie">{j.listo ? 'listo' : 'esperando'}</span>
          </li>
        ))}
      </ul>

      <p className="al-pie">
        {jugadores.length < 2
          ? 'faltan viajeros'
          : `${jugadores.length} en la caravana · la partida empieza cuando estén todos listos`}
      </p>
    </main>
  );
}
