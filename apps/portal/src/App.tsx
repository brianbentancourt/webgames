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

function Tarjeta({ juego }: { juego: FichaJuego }) {
  const [conImagen, setConImagen] = useState(true);
  const jugable = juego.estado === 'jugable';
  return (
    <li className="tarjeta" data-estado={juego.estado}>
      {conImagen && (
        <img
          className="tarjeta-imagen"
          src={`/${juego.id}/icon.jpg`}
          alt=""
          onError={() => setConImagen(false)}
        />
      )}
      <div className="tarjeta-cuerpo">
        <h2 className="tarjeta-nombre">{juego.nombre}</h2>
        <p className="tarjeta-resumen">{juego.resumen}</p>
        <p className="tarjeta-datos">
          <span>👥 {juego.jugadores}</span>
          <span>⏱ {juego.minutos} min</span>
          {!jugable && <span>en obra</span>}
        </p>
        {jugable && (
          <div className="acciones">
            <a className="boton boton-tele" href={`/${juego.id}/`}>
              <span className="boton-icono" aria-hidden>📺</span>
              Abrir en la tele
            </a>
            <a className="boton boton-celu" href={`/${juego.id}/control/`}>
              <span className="boton-icono" aria-hidden>📱</span>
              Unirme desde el celu
            </a>
          </div>
        )}
      </div>
    </li>
  );
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
      <header className="cabecera">
        <h1 className="marca">Juegos</h1>
        <p className="bajada">para jugar en el living · la tele es el tablero, los celulares son las cartas</p>
      </header>

      {error && <p className="aviso">No se pudo hablar con el servidor. Recargá en un rato.</p>}
      {juegos === null && !error && <p className="aviso">buscando juegos…</p>}
      {juegos?.length === 0 && <p className="aviso">Todavía no hay ninguno.</p>}

      <ul className="lista">
        {juegos?.map((juego) => (
          <Tarjeta key={juego.id} juego={juego} />
        ))}
      </ul>

      <footer className="pie">
        <span>¿Primera vez?</span> Abrí el juego en la tele y escaneen el código con el celu.
      </footer>
    </main>
  );
}
