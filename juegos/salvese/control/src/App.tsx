/**
 * El celular. Una acción por pantalla, nunca dos.
 *
 * Acá vive entrar a la sala, votar tablero y marcarse listo. La partida la
 * maneja `JuegoControl`.
 */

import { useEffect, useState } from 'react';
import type { CodigoError, MensajeEntrante, VistaJugador } from '@salvese/core';
import { colorDeAsiento } from '@salvese/core';
import { useConexion } from './conexion.js';
import { JuegoControl } from './JuegoControl.js';
import { Ficha, Marco } from './Marco.js';

/** Lo que el servidor dice en código, dicho para una persona con el celu en la mano. */
const ERRORES: Partial<Record<CodigoError, string>> = {
  sala_inexistente: 'No hay ninguna sala con ese código. Fijate en la tele.',
  sala_llena: 'La sala está llena: entran hasta 10.',
  mensaje_ilegible: 'Algo salió mal. Probá de nuevo.',
  jugada_invalida: 'Revisá el código y el nombre.',
};

interface EnSala {
  id: string;
  nombre: string;
  listo: boolean;
}

function Entrada({
  codigo,
  setCodigo,
  nombre,
  setNombre,
  error,
  cargando,
  entrar,
}: {
  codigo: string;
  setCodigo: (v: string) => void;
  nombre: string;
  setNombre: (v: string) => void;
  error: string | null;
  cargando: boolean;
  entrar: () => void;
}) {
  const puede = codigo.length === 4 && nombre.trim().length > 0 && !cargando;
  return (
    <Marco
      clase="marco-entrada"
      derecha={
        <>
          <a className="enlace-volver" href="/">
            ← juegos
          </a>
          {/* Mandar la tele por Chromecast desde el celu (D13). */}
          {/* @ts-ignore: elemento del SDK de Cast, sin tipos */}
          <google-cast-launcher class="boton-cast"></google-cast-launcher>
        </>
      }
    >
      <div className="portada">
        <p className="portada-marca">Sálvese quien pueda</p>
        <p className="portada-bajada">¿Seguís o te volvés con lo que cargás?</p>
      </div>
      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault();
          if (puede) entrar();
        }}
      >
        <label className="campo">
          <span className="campo-etiqueta">código de la sala</span>
          <input
            className="campo-codigo"
            value={codigo}
            disabled={cargando}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
            placeholder="····"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          <span className="campo-ayuda">son las 4 letras grandes de la tele</span>
        </label>
        <label className="campo">
          <span className="campo-etiqueta">tu nombre</span>
          <input
            value={nombre}
            disabled={cargando}
            onChange={(e) => setNombre(e.target.value.slice(0, 16))}
            placeholder="como te dicen"
            autoComplete="nickname"
            enterKeyHint="go"
          />
        </label>
        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={!puede}>
          {cargando ? 'entrando…' : 'entrar'}
        </button>
      </form>
    </Marco>
  );
}

function SalaDeEspera({
  miId,
  jugadores,
  tableros,
  votos,
  cuentaRegresiva,
  codigo,
  mandar,
}: {
  miId: string | null;
  jugadores: EnSala[];
  tableros: { id: string; nombre: string }[];
  votos: Record<string, string>;
  cuentaRegresiva: number | null;
  codigo: string;
  mandar: (m: MensajeEntrante) => void;
}) {
  const asiento = Math.max(0, jugadores.findIndex((j) => j.id === miId));
  const yo = jugadores[asiento];
  const listo = yo?.listo ?? false;
  const miVoto = miId !== null ? votos[miId] : undefined;
  const listos = jugadores.filter((j) => j.listo).length;

  return (
    <Marco ficha={yo ? { color: colorDeAsiento(asiento), nombre: yo.nombre } : undefined} derecha={<span className="sala-codigo">{codigo}</span>}>
      {cuentaRegresiva !== null ? (
        <div className="cuenta-celu">
          <span className="estado-etiqueta">arranca en</span>
          <span className="cuenta-celu-numero" key={cuentaRegresiva}>
            {cuentaRegresiva}
          </span>
          <span className="estado-texto">Mirá la tele.</span>
        </div>
      ) : (
        <>
          <div className="bienvenida">
            <p className="estado-titulo">{listo ? '¡Listo!' : 'Ya estás adentro'}</p>
            <p className="estado-texto">
              {listo ? 'Cuando estén todos, arranca. Mirá la tele.' : 'Elegí tablero y avisá cuando estés listo.'}
            </p>
          </div>
          <section className="bloque">
            <p className="estado-etiqueta">en la caravana · {jugadores.length}</p>
            <ul className="lista-fichas">
              {jugadores.map((j, i) => (
                <li key={j.id} className={j.listo ? 'ficha-lista' : ''}>
                  <Ficha color={colorDeAsiento(i)} nombre={j.id === miId ? `${j.nombre} (vos)` : j.nombre} />
                  <span className="ficha-check">{j.listo ? '✓' : ''}</span>
                </li>
              ))}
            </ul>
          </section>

          {tableros.length > 1 && (
            <section className="bloque">
              <p className="estado-etiqueta">¿qué tablero?</p>
              <div className="opciones">
                {tableros.map((t) => {
                  const n = Object.values(votos).filter((v) => v === t.id).length;
                  return (
                    <button
                      key={t.id}
                      className={`boton-opcion ${miVoto === t.id ? 'seleccionado' : ''}`}
                      aria-pressed={miVoto === t.id}
                      onClick={() => mandar({ t: 'votar_tablero', tablero: t.id })}
                    >
                      <span className="opcion-nombre">{t.nombre}</span>
                      <span className="opcion-votos">{n > 0 ? `${n} voto${n === 1 ? '' : 's'}` : ''}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="pie-accion">
            {listo && (
              <p className="estado-texto">
                Esperando a los demás · {listos} de {jugadores.length} listos
              </p>
            )}
            <button
              className={listo ? 'secundario' : ''}
              onClick={() => mandar({ t: 'listo', listo: !listo })}
            >
              {listo ? 'esperá, todavía no' : 'estoy listo'}
            </button>
          </div>
        </>
      )}
    </Marco>
  );
}

export function App() {
  const { estado, ultimo, mandar, desactualizado } = useConexion();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [dentro, setDentro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null);
  const [vistaJuego, setVistaJuego] = useState<VistaJugador | null>(null);
  const [enEspera, setEnEspera] = useState(false);
  const [jugadores, setJugadores] = useState<EnSala[]>([]);
  const [miId, setMiId] = useState<string | null>(null);
  const [tableros, setTableros] = useState<{ id: string; nombre: string }[]>([]);
  const [votos, setVotos] = useState<Record<string, string>>({});

  const [volviendoSolo, setVolviendoSolo] = useState(false);

  useEffect(() => {
    const sala = new URLSearchParams(window.location.search).get('sala');
    if (sala) setCodigo(sala.toUpperCase().slice(0, 4));
  }, []);

  // Cada vez que el socket abre —al cargar, al recargar, o porque se cortó el
  // WiFi— el servidor no sabe quién es este socket hasta que se presenta. Si
  // hay sesión guardada para esta sala, se presenta solo y vuelve a su asiento:
  // a nadie se le pide que vuelva a escribir su nombre en la noche 3.
  useEffect(() => {
    if (estado !== 'abierta') return;
    const sala = localStorage.getItem('salvese.sala');
    const sesion = localStorage.getItem('salvese.sesion');
    const guardado = localStorage.getItem('salvese.nombre');
    const salaUrl = new URLSearchParams(window.location.search).get('sala')?.toUpperCase();
    if (!sala || !sesion || !guardado || (salaUrl && salaUrl !== sala)) return;
    setCodigo(sala);
    setNombre(guardado);
    setVolviendoSolo(true);
    mandar({ t: 'unirse', sala, nombre: guardado, sesion });
  }, [estado, mandar]);

  useEffect(() => {
    if (ultimo === null) return;
    if (ultimo.t === 'bienvenida' && ultimo.jugador !== undefined) {
      setVolviendoSolo(false);
      setDentro(true);
      setMiId(ultimo.jugador);
      setError(null);
      setCargando(false);
    }
    if (ultimo.t === 'error') {
      // La vuelta automática falló (la sala ya no existe): se olvida y se
      // muestra el formulario limpio, sin un error que nadie pidió.
      if (volviendoSolo && (ultimo.codigo === 'sala_inexistente' || ultimo.codigo === 'sesion_invalida')) {
        localStorage.removeItem('salvese.sesion');
        localStorage.removeItem('salvese.sala');
        setVolviendoSolo(false);
        setCargando(false);
        return;
      }
      if (ultimo.codigo === 'sesion_invalida') {
        localStorage.removeItem('salvese.sesion');
        localStorage.removeItem('salvese.sala');
        mandar({ t: 'unirse', sala: codigo, nombre: nombre.trim() });
        return;
      }
      setError(ERRORES[ultimo.codigo] ?? ultimo.mensaje);
      setCargando(false);
    }
    if (ultimo.t === 'sala') {
      setCuentaRegresiva(ultimo.cuentaRegresiva ?? null);
      setJugadores(ultimo.jugadores);
      setTableros(ultimo.tableros);
      setVotos(ultimo.votos);
    }
    if (ultimo.t === 'jugador') {
      setEnEspera(false);
      setVistaJuego(ultimo.vista);
    }
    if (ultimo.t === 'en_espera') setEnEspera(true);
  }, [ultimo, codigo, nombre, mandar, volviendoSolo]);

  const entrar = () => {
    if (cargando) return;
    setCargando(true);
    setError(null);
    localStorage.setItem('salvese.nombre', nombre.trim());
    const salaGuardada = localStorage.getItem('salvese.sala');
    const sesionGuardada = localStorage.getItem('salvese.sesion');
    mandar({
      t: 'unirse',
      sala: codigo,
      nombre: nombre.trim(),
      ...(salaGuardada === codigo && sesionGuardada ? { sesion: sesionGuardada } : {}),
    });
  };

  // Recargarse solo ya se intentó una vez en `conexion.ts` y no alcanzó: acá el
  // problema no es el caché, así que se dice y no se reintenta en loop.
  if (desactualizado) {
    return (
      <Marco>
        <div className="estado">
          <p className="estado-etiqueta">esta pantalla quedó vieja</p>
          <p className="estado-titulo">El servidor se actualizó.</p>
          <p className="estado-texto">Cerrá la pestaña y volvé a entrar con el código de la sala.</p>
        </div>
      </Marco>
    );
  }

  if (estado !== 'abierta') {
    return (
      <Marco>
        <div className="estado">
          <p className="estado-etiqueta">{estado === 'cerrada' ? 'se cortó' : 'conectando'}</p>
          <p className="estado-titulo">{estado === 'cerrada' ? 'Reconectando…' : 'Un segundo…'}</p>
          {dentro && <p className="estado-texto">No cierres la pestaña: volvés a tu lugar solo.</p>}
        </div>
      </Marco>
    );
  }

  if (enEspera) {
    return (
      <Marco ficha={{ color: '#6b6b6b', nombre: nombre || 'vos' }}>
        <div className="estado">
          <span className="estado-icono" aria-hidden>
            ⏳
          </span>
          <p className="estado-titulo">La partida ya empezó.</p>
          <p className="estado-texto">
            Entrás en la próxima: cuando termine, alguien pide otra y quedás adentro. Mientras, mirá la tele.
          </p>
        </div>
      </Marco>
    );
  }

  if (vistaJuego) return <JuegoControl vista={vistaJuego} mandar={mandar} />;

  if (!dentro && volviendoSolo) {
    return (
      <Marco>
        <div className="estado">
          <p className="estado-etiqueta">volviendo</p>
          <p className="estado-titulo">A tu lugar…</p>
        </div>
      </Marco>
    );
  }

  if (!dentro) {
    return (
      <Entrada
        codigo={codigo}
        setCodigo={setCodigo}
        nombre={nombre}
        setNombre={setNombre}
        error={error}
        cargando={cargando}
        entrar={entrar}
      />
    );
  }

  return (
    <SalaDeEspera
      miId={miId}
      jugadores={jugadores}
      tableros={tableros}
      votos={votos}
      cuentaRegresiva={cuentaRegresiva}
      codigo={codigo}
      mandar={mandar}
    />
  );
}
