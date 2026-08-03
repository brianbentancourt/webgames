/**
 * El celular. Una acción por pantalla, nunca dos.
 *
 * ESTADO: entrar a la sala y marcarse listo. Las pantallas de ruta, raciones y
 * esfuerzo entran cuando el servidor mande vistas `jugador`
 * (ver docs/specs/09-cliente-control.md).
 */

import { useEffect, useState } from 'react';
import { useConexion } from './conexion.js';

export function App() {
  const { estado, ultimo, mandar } = useConexion();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [dentro, setDentro] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ultimo === null) return;
    if (ultimo.t === 'bienvenida' && ultimo.jugador !== undefined) {
      setDentro(true);
      setError(null);
    }
    if (ultimo.t === 'error') setError(ultimo.mensaje);
  }, [ultimo]);

  if (estado !== 'abierta') {
    return (
      <main className="pantalla">
        <p className="titulo">conectando</p>
      </main>
    );
  }

  if (!dentro) {
    return (
      <main className="pantalla">
        <p className="titulo">el código está en la tele</p>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="····"
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode="text"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, 16))}
          placeholder="tu nombre"
          style={{ letterSpacing: 'normal', fontSize: 22 }}
        />
        {error !== null && <p className="error">{error}</p>}
        <button
          disabled={codigo.length !== 4 || nombre.trim().length === 0}
          onClick={() => mandar({ t: 'unirse', sala: codigo, nombre: nombre.trim() })}
        >
          entrar
        </button>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <p className="titulo">{nombre}</p>
      <p className="linea">Ya estás en la caravana. Mirá la tele.</p>
      <button
        className={listo ? 'secundario' : ''}
        onClick={() => {
          const nuevo = !listo;
          setListo(nuevo);
          mandar({ t: 'listo', listo: nuevo });
        }}
      >
        {listo ? 'esperá, todavía no' : 'listo'}
      </button>
    </main>
  );
}
