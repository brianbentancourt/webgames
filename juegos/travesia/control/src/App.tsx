/**
 * El celular. Una acción por pantalla, nunca dos.
 *
 * ESTADO: entrar a la sala y marcarse listo. Las pantallas de ruta, raciones y
 * esfuerzo entran cuando el servidor mande vistas `jugador`
 * (ver docs/specs/09-cliente-control.md).
 */

import { useEffect, useState } from 'react';
import type { VistaJugador } from '@travesia/core';
import { useConexion } from './conexion.js';
import { JuegoControl } from './JuegoControl.js';

export function App() {
  const { estado, ultimo, mandar } = useConexion();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [dentro, setDentro] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null);
  const [enJuego, setEnJuego] = useState(false);
  const [vistaJuego, setVistaJuego] = useState<VistaJugador | null>(null);
  const [jugadores, setJugadores] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaParam = params.get('sala');
    if (salaParam) {
      setCodigo(salaParam.toUpperCase().slice(0, 4));
    }
  }, []);

  useEffect(() => {
    if (ultimo === null) return;
    if (ultimo.t === 'bienvenida' && ultimo.jugador !== undefined) {
      setDentro(true);
      setError(null);
      setCargando(false);
    }
    if (ultimo.t === 'error') {
      if (ultimo.codigo === 'sesion_invalida') {
        localStorage.removeItem('travesia.sesion');
        localStorage.removeItem('travesia.sala');
        mandar({ t: 'unirse', sala: codigo, nombre: nombre.trim() });
        return;
      }
      setError(ultimo.mensaje);
      setCargando(false);
    }
    if (ultimo.t === 'sala') {
      setCuentaRegresiva(ultimo.cuentaRegresiva ?? null);
      setJugadores(ultimo.jugadores);
    }
    if (ultimo.t === 'jugador') {
      setEnJuego(true);
      setVistaJuego(ultimo.vista);
    }
  }, [ultimo, codigo, nombre, mandar]);

  const nombreDe = (id: string) => jugadores.find((j) => j.id === id)?.nombre ?? id;

  const handleEntrar = () => {
    if (cargando) return;
    setCargando(true);
    setError(null);
    const savedSala = localStorage.getItem('travesia.sala');
    const savedSesion = localStorage.getItem('travesia.sesion');
    const params: any = { t: 'unirse', sala: codigo, nombre: nombre.trim() };
    if (savedSala === codigo && savedSesion) {
      params.sesion = savedSesion;
    }
    mandar(params);
  };

  if (estado !== 'abierta') {
    return (
      <main className="pantalla">
        <p className="titulo">conectando</p>
      </main>
    );
  }

  if (enJuego && vistaJuego) {
    return <JuegoControl vista={vistaJuego} mandar={mandar} nombreDe={nombreDe} />;
  }

  if (!dentro) {
    return (
      <main className="pantalla">
        <div>
          <p className="titulo" style={{ color: 'var(--brasa)', opacity: 0.9 }}>La Travesía</p>
          <p className="linea">Unirse a la caravana</p>
        </div>
        <input
          value={codigo}
          disabled={cargando}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="CÓDIGO"
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode="text"
        />
        <input
          value={nombre}
          disabled={cargando}
          onChange={(e) => setNombre(e.target.value.slice(0, 16))}
          placeholder="tu nombre"
          style={{ letterSpacing: 'normal', fontSize: 22 }}
        />
        {error !== null && <p className="error">{error}</p>}
        <button
          disabled={codigo.length !== 4 || nombre.trim().length === 0 || cargando}
          onClick={handleEntrar}
        >
          {cargando ? 'entrando...' : 'entrar'}
        </button>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <p className="titulo">{nombre}</p>
      <p className="linea">Ya estás en la caravana. Mirá la tele.</p>
      
      {cuentaRegresiva !== null ? (
        <p className="linea" style={{ color: 'var(--brasa)', fontWeight: 'bold' }}>
          Iniciando en {cuentaRegresiva} segundos...
        </p>
      ) : (
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
      )}
    </main>
  );
}
