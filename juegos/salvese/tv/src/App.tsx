/**
 * Renderer tonto (D4). Recibe estado y pinta. No calcula reglas, no decide cuándo
 * animar: las animaciones se disparan por cambio de `paso`.
 *
 * Acá vive la sala: cómo sumarse, cómo se juega, quién llegó y qué tablero se
 * vota. La partida la pinta `JuegoTV`.
 *
 * La sala es lo primero que ve una mesa que nunca jugó, desde el sillón. Tiene
 * que contestar tres preguntas sin que nadie lea en voz alta: cómo entro, de qué
 * se trata y cuándo arranca.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { VistaTV } from '@salvese/core';
import { colorDeAsiento, LIMITES } from '@salvese/core';
import { useConexion } from './conexion.js';
import { JuegoTV } from './JuegoTV.js';

interface JugadorEnSala {
  id: string;
  nombre: string;
  listo: boolean;
}

/** Mínimo para que la partida tenga gracia (la ficha del portal dice 3). */
const MINIMO_RECOMENDADO = 3;

/**
 * Adónde mandar a los celulares. En producción el control cuelga del mismo
 * origen; en desarrollo lo sirve otro Vite, en el 5174 del mismo host.
 */
function urlControl(codigo: string | null): { completa: string; visible: string } {
  const base = import.meta.env.DEV
    ? `${location.protocol}//${location.hostname}:5174/`
    : `${location.origin}/salvese/control/`;
  return {
    completa: codigo ? `${base}?sala=${codigo}` : base,
    visible: base.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  };
}

const PASOS = [
  {
    icono: '🃏',
    titulo: 'Se da vuelta un tramo',
    texto: 'La plata que aparece se reparte entre los que siguen en el camino.',
  },
  {
    icono: '🤫',
    titulo: '¿Sigo o me vuelvo?',
    texto: 'Cada uno elige en secreto. El que vuelve guarda lo que carga.',
  },
  {
    icono: '⚠️',
    titulo: 'Dos veces el mismo peligro',
    texto: 'Los que siguen en el camino pierden todo lo que cargan.',
  },
];

function Sala({
  codigo,
  jugadores,
  tableros,
  votos,
  cuentaRegresiva,
  quitar,
}: {
  codigo: string | null;
  jugadores: JugadorEnSala[];
  tableros: { id: string; nombre: string }[];
  votos: Record<string, string>;
  cuentaRegresiva: number | null;
  quitar: (id: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const url = urlControl(codigo);

  useEffect(() => {
    if (!codigo) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(url.completa, { margin: 1, width: 480, color: { dark: '#1a140e', light: '#f3e9d2' } })
      .then(setQr)
      .catch((err) => console.error('no se pudo generar el QR:', err));
  }, [codigo, url.completa]);

  const listos = jugadores.filter((j) => j.listo).length;
  const conteo = (id: string) => Object.values(votos).filter((v) => v === id).length;
  const masVotado = Math.max(0, ...tableros.map((t) => conteo(t.id)));

  let estado: string;
  if (jugadores.length === 0) estado = 'Esperando viajeros: escaneen el código con el celular.';
  else if (jugadores.length < LIMITES.jugadoresMin) estado = 'Falta al menos uno más.';
  else if (listos < jugadores.length)
    estado = `${listos} de ${jugadores.length} listos · arranca cuando estén todos`;
  else estado = 'Todos listos.';

  return (
    <main className="sala">
      <header className="sala-cabecera">
        <div>
          <h1 className="sala-marca">Sálvese quien pueda</h1>
          <p className="sala-bajada">¿Seguís o te volvés con lo que cargás?</p>
        </div>
        <a className="sala-volver" href="/">
          ← juegos
        </a>
      </header>

      <section className="sala-cuerpo">
        <ol className="como-se-juega">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="paso-regla">
              <span className="paso-numero">{i + 1}</span>
              <span className="paso-icono" aria-hidden>
                {p.icono}
              </span>
              <span className="paso-titulo">{p.titulo}</span>
              <span className="paso-texto">{p.texto}</span>
            </li>
          ))}
          <li className="paso-regla paso-gana">
            <span className="paso-titulo">Cinco noches. Gana el baúl más lleno.</span>
          </li>
        </ol>

        <div className="sumate">
          <p className="sumate-titulo">Sumate desde el celu</p>
          <div className="sumate-qr">{qr ? <img src={qr} alt="QR para entrar a la sala" /> : <span />}</div>
          <p className="sumate-url">
            o entrá a <strong>{url.visible}</strong>
          </p>
          <p className="sumate-codigo-label">código</p>
          <p className="sumate-codigo">{codigo ?? '····'}</p>
        </div>
      </section>

      <section className="sala-pie">
        <div className="caravana-sala">
          {jugadores.map((j, i) => (
            <div
              key={j.id}
              className={`ficha-viajero ${j.listo ? 'ficha-lista' : ''}`}
              style={{ '--color-viajero': colorDeAsiento(i) } as React.CSSProperties}
            >
              <div className="silueta-avatar-sombra">
                <div className="silueta-cabeza" />
                <div className="silueta-avatar" />
              </div>
              <span className="ficha-nombre">{j.nombre}</span>
              <span className="ficha-estado">{j.listo ? 'listo' : '…'}</span>
              <button className="boton-quitar" onClick={() => quitar(j.id)} title={`Sacar a ${j.nombre}`}>
                ×
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, MINIMO_RECOMENDADO - jugadores.length) }, (_, i) => (
            <div key={`vacio-${i}`} className="ficha-viajero ficha-vacia" aria-hidden>
              <div className="silueta-avatar-sombra">
                <div className="silueta-cabeza" />
                <div className="silueta-avatar" />
              </div>
              <span className="ficha-nombre">&nbsp;</span>
            </div>
          ))}
        </div>

        <div className="sala-lateral">
          {tableros.length > 1 && (
            <div className="votacion">
              <p className="votacion-titulo">tablero · se vota en el celu</p>
              <div className="votacion-opciones">
                {tableros.map((t) => {
                  const n = conteo(t.id);
                  return (
                    <span key={t.id} className={`ficha-tablero ${n > 0 && n === masVotado ? 'ficha-tablero-gana' : ''}`}>
                      {t.nombre}
                      <strong>{n}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <p className="sala-estado">{estado}</p>
        </div>
      </section>

      {cuentaRegresiva !== null && (
        <div className="cuenta-sala" key={cuentaRegresiva}>
          <span className="cuenta-sala-texto">arranca en</span>
          <span className="cuenta-sala-numero">{cuentaRegresiva}</span>
        </div>
      )}
    </main>
  );
}

export function App() {
  const { estado, ultimo, mandar, desactualizado } = useConexion();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<JugadorEnSala[]>([]);
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null);
  const [vistaJuego, setVistaJuego] = useState<VistaTV | null>(null);
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
    if (ultimo.t === 'tv') setVistaJuego(ultimo.vista);
  }, [ultimo]);

  // Recargarse solo ya se intentó una vez en `conexion.ts` y no alcanzó: acá el
  // problema no es el caché, así que se dice y no se reintenta en loop.
  if (desactualizado) {
    return (
      <main className="aviso-pantalla">
        <p className="aviso-titulo">El servidor se actualizó</p>
        <p className="aviso-texto">Recargá esta pantalla para seguir jugando.</p>
      </main>
    );
  }

  if (estado !== 'abierta') {
    return (
      <main className="aviso-pantalla">
        <p className="aviso-titulo brasa">Sálvese quien pueda</p>
        <p className="aviso-texto">buscando el servidor…</p>
      </main>
    );
  }

  if (vistaJuego) return <JuegoTV vista={vistaJuego} codigo={codigo} />;

  return (
    <Sala
      codigo={codigo}
      jugadores={jugadores}
      tableros={tableros}
      votos={votos}
      cuentaRegresiva={cuentaRegresiva}
      quitar={(id) => mandar({ t: 'quitar_jugador', jugador: id })}
    />
  );
}
