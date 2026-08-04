/**
 * Renderer tonto (D4). Recibe estado y pinta. No calcula reglas, no decide cuándo
 * animar: las animaciones se disparan por transición de estado.
 *
 * ESTADO: solo la pantalla de sala. Las escenas de fogata, avance y fogón entran
 * cuando el servidor mande vistas `tv` (ver docs/specs/08-cliente-tv.md).
 */

import { useEffect, useState } from 'react';
import { useConexion } from './conexion.js';
import QRCode from 'qrcode';

interface JugadorEnSala {
  id: string;
  nombre: string;
  listo: boolean;
}

import { JuegoTV } from './JuegoTV.js';

export function App() {
  const { estado, ultimo, mandar } = useConexion();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<JugadorEnSala[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null);
  const [enJuego, setEnJuego] = useState(false);
  const [vistaJuego, setVistaJuego] = useState<any>(null);
  const [tableros, setTableros] = useState<{ id: string; nombre: string }[]>([]);
  const [votos, setVotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ultimo === null) return;
    if (ultimo.t === 'sala') {
      setCodigo(ultimo.codigo);
      setJugadores(ultimo.jugadores);
      setCuentaRegresiva(ultimo.cuentaRegresiva ?? null);
      setTableros(ultimo.tableros);
      setVotos(ultimo.votos);
    }
    if (ultimo.t === 'tv') {
      setEnJuego(true);
      setVistaJuego(ultimo.vista);
    }
  }, [ultimo]);

  useEffect(() => {
    if (codigo) {
      const controlUrl = `${window.location.origin}/travesia/control/?sala=${codigo}`;
      QRCode.toDataURL(controlUrl, { margin: 1, width: 200 })
        .then(setQrUrl)
        .catch((err) => console.error('Error al generar QR:', err));
    } else {
      setQrUrl(null);
    }
  }, [codigo]);

  if (estado !== 'abierta') {
    return (
      <main className="pantalla">
        <p className="al-pie">buscando el servidor…</p>
      </main>
    );
  }

  if (enJuego && vistaJuego) {
    return <JuegoTV vista={vistaJuego} />;
  }

  return (
    <main className="pantalla">
      <section style={{ display: 'flex', alignItems: 'center', gap: '3vw' }}>
        <div>
          <p className="al-pie">
            Entrá desde tu celular a: <strong style={{ color: 'var(--tinta)', opacity: 0.9 }}>{window.location.host}/travesia/control</strong> y poné el código o escaneá el QR:
          </p>
          <p className="codigo brasa">{codigo ?? '····'}</p>
        </div>
        {qrUrl && (
          <div className="qr-container">
            <img className="qr-code" src={qrUrl} alt="QR de la sala" />
          </div>
        )}
      </section>

      <ul className="viajeros">
        {jugadores.map((j) => (
          <li className="viajero" key={j.id} data-listo={j.listo} style={{ position: 'relative' }}>
            <span>{j.nombre}</span>
            <span className="al-pie">{j.listo ? 'listo' : 'esperando'}</span>
            <button
              className="boton-quitar"
              onClick={() => mandar({ t: 'quitar_jugador', jugador: j.id })}
              title="Quitar de la caravana"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {cuentaRegresiva === null && tableros.length > 0 && (
        <p className="al-pie">
          tablero:{' '}
          {tableros
            .map((t) => `${t.nombre} (${Object.values(votos).filter((v) => v === t.id).length})`)
            .join(' · ')}
        </p>
      )}

      <p className="al-pie">
        {cuentaRegresiva !== null ? (
          <span style={{ fontSize: '2rem', color: 'var(--brasa)', fontWeight: 'bold' }}>
            iniciando en {cuentaRegresiva} segundos...
          </span>
        ) : jugadores.length < 2 ? (
          'faltan viajeros'
        ) : (
          `${jugadores.length} en la caravana · la partida empieza cuando estén todos listos`
        )}
      </p>
    </main>
  );
}
