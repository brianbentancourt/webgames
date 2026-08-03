/**
 * El menú. Una lista de juegos y nada más.
 *
 * Se abre en la tele, así que vale lo mismo que para el tablero: se mira de reojo
 * desde tres metros. También se abre en un celular, así que las tarjetas son
 * botones grandes. Lo que no hace es explicar los juegos: eso lo hace el juego.
 *
 * La lista sale de `/api/juegos`, que es el mismo registro con el que el servidor
 * monta las rutas. No hay una segunda lista que se pueda desincronizar.
 */

import { useEffect, useState } from 'react';

interface FichaJuego {
  id: string;
  nombre: string;
  resumen: string;
  jugadores: string;
  minutos: number;
  estado: 'jugable' | 'en_obra';
}

export function App() {
  const [juegos, setJuegos] = useState<FichaJuego[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/juegos')
      .then((r) => (r.ok ? (r.json() as Promise<FichaJuego[]>) : Promise.reject()))
      .then(setJuegos)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="pantalla">
      <header>
        <h1 className="marca brasa">Juegos</h1>
        <p className="al-pie">para jugar en el living, con la tele de tablero</p>
      </header>

      {error && <p className="al-pie">no se pudo hablar con el servidor</p>}
      {juegos === null && !error && <p className="al-pie">buscando juegos…</p>}

      <ul className="lista">
        {juegos?.map((juego) => (
          <li key={juego.id}>
            <a
              className="tarjeta"
              href={juego.estado === 'jugable' ? `/${juego.id}` : undefined}
              data-estado={juego.estado}
            >
              <span className="nombre">{juego.nombre}</span>
              <span className="resumen">{juego.resumen}</span>
              <span className="al-pie">
                {juego.jugadores} · {juego.minutos} min
                {juego.estado === 'en_obra' && ' · en obra'}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <footer className="al-pie">
        {juegos?.length === 0 ? 'todavía no hay ninguno' : 'elegí uno en la tele'}
      </footer>
    </main>
  );
}
