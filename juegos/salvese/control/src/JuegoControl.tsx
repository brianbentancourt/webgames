import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MensajeEntrante, VistaJugador } from '@salvese/core';
import { Marco } from './Marco.js';

/**
 * El celular durante la partida. Una sola cosa por pantalla, y casi siempre esa
 * cosa es "mirá la tele". Lo único que se toca es sigo o me vuelvo.
 *
 * Cada pantalla tiene la misma forma: una etiqueta chica (dónde estás), un
 * titular grande (qué pasa) y, abajo, tus dos números: lo que cargás —que se
 * puede perder— y lo que guardaste —que no—.
 */

function useSegundos(restanteMs: number | null, paso: number): number | null {
  const [vence, setVence] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    setVence(restanteMs === null ? null : Date.now() + restanteMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, restanteMs === null]);
  useEffect(() => {
    if (vence === null) return;
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [vence]);
  return vence === null ? null : Math.max(0, Math.ceil((vence - ahora) / 1000));
}

function Lunas({ noche, total }: { noche: number; total: number }) {
  return (
    <span className="lunas" aria-label={`noche ${noche} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`luna ${i + 1 < noche ? 'luna-pasada' : i + 1 === noche ? 'luna-actual' : ''}`} />
      ))}
    </span>
  );
}

function Numeros({ vista }: { vista: VistaJugador }) {
  const enCamino = vista.yo.lugar === 'camino' && vista.fase !== 'fin_noche' && vista.fase !== 'final';
  return (
    <div className="numeros">
      <div className={`numero-caja ${enCamino ? '' : 'numero-apagado'}`}>
        <span className="numero-etiqueta">cargás</span>
        <span className="numero-valor">{enCamino ? vista.yo.mochila : '—'}</span>
        <span className="numero-nota">se puede perder</span>
      </div>
      <div className="numero-caja numero-baul">
        <span className="numero-etiqueta">tu baúl 🔒</span>
        <span className="numero-valor">{vista.yo.baul}</span>
        <span className="numero-nota">secreto</span>
      </div>
    </div>
  );
}

function Estado({
  tono,
  icono,
  etiqueta,
  titulo,
  texto,
}: {
  tono: 'neutro' | 'calido' | 'peligro' | 'bien';
  icono: string;
  etiqueta: string;
  titulo: ReactNode;
  texto?: ReactNode;
}) {
  return (
    <div className={`estado estado-${tono}`}>
      <span className="estado-icono" aria-hidden>
        {icono}
      </span>
      <p className="estado-etiqueta">{etiqueta}</p>
      <p className="estado-titulo">{titulo}</p>
      {texto !== undefined && <p className="estado-texto">{texto}</p>}
    </div>
  );
}

export function JuegoControl({ vista, mandar }: { vista: VistaJugador; mandar: (m: MensajeEntrante) => void }) {
  const segundos = useSegundos(vista.restanteMs, vista.paso);
  const [pidioRevancha, setPidioRevancha] = useState(false);
  const yaVibro = useRef(-1);

  // Que el celular avise cuando hay que decidir: la cabeza está en la mesa,
  // no en la pantalla.
  useEffect(() => {
    if (vista.puedoElegir && yaVibro.current !== vista.paso) {
      yaVibro.current = vista.paso;
      try {
        navigator.vibrate?.(60);
      } catch {
        // sin vibración, sin drama
      }
    }
  }, [vista.puedoElegir, vista.paso]);

  useEffect(() => {
    if (vista.fase !== 'final') setPidioRevancha(false);
  }, [vista.fase]);

  const { yo, tesoro } = vista;
  const ficha = { color: yo.color, nombre: yo.nombre };
  const lunas = vista.fase === 'final' ? null : <Lunas noche={vista.noche} total={vista.nochesTotales} />;

  /* --- el final --- */
  if (vista.fase === 'final' && vista.final) {
    const f = vista.final;
    return (
      <Marco ficha={ficha} clase="marco-final">
        <div className={`estado ${f.puesto === 1 ? 'estado-calido' : 'estado-neutro'}`}>
          <span className="estado-icono" aria-hidden>
            {f.puesto === 1 ? '🏆' : f.puesto === f.de ? '🪦' : '🎒'}
          </span>
          <p className="estado-etiqueta">fin de la travesía</p>
          <p className="estado-titulo">{f.puesto === 1 ? '¡Ganaste!' : `Saliste ${f.puesto}º de ${f.de}`}</p>
          <p className="estado-texto">
            Juntaste <strong className="dato">{f.baul}</strong> de {tesoro}.
          </p>
          {f.premios.length > 0 && (
            <ul className="premios-celu">
              {f.premios.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="pie-accion">
          <button
            disabled={pidioRevancha}
            onClick={() => {
              setPidioRevancha(true);
              mandar({ t: 'revancha' });
            }}
          >
            {pidioRevancha ? 'arrancando…' : 'otra partida'}
          </button>
        </div>
      </Marco>
    );
  }

  /* --- la decisión: dos botones que se tocan sin mirar --- */
  if (vista.fase === 'decidir' && vista.puedoElegir) {
    const solo = vista.compania === 0;
    return (
      <Marco ficha={ficha} derecha={lunas} clase="marco-decidir">
        <div className="decidir-encabezado">
          <p className="decidir-carga">
            cargás <strong>{yo.mochila}</strong> de {tesoro}
          </p>
          <p className="decidir-reloj">
            {segundos !== null && <span className={segundos <= 5 ? 'urgente' : ''}>{segundos}</span>}
          </p>
        </div>
        <button className="boton-gigante boton-sigo" onClick={() => mandar({ t: 'elegir', opcion: 'sigo' })}>
          <span className="boton-gigante-texto">sigo</span>
          <span className="boton-gigante-nota">{solo ? 'solo en el camino' : `con ${vista.compania} más`}</span>
        </button>
        <button className="boton-gigante boton-vuelvo" onClick={() => mandar({ t: 'elegir', opcion: 'vuelvo' })}>
          <span className="boton-gigante-texto">me vuelvo</span>
          <span className="boton-gigante-nota">
            guardás {yo.mochila}
            {vista.tirado > 0 ? ` + hasta ${vista.tirado} tirados` : ''}
          </span>
        </button>
        <p className="pie-decidir">si no elegís, seguís</p>
      </Marco>
    );
  }

  /* --- todo lo demás: mirá la tele --- */
  let estado: ReactNode;

  if (vista.fase === 'fin_noche' && vista.miNoche) {
    const { ganado, perdido } = vista.miNoche;
    estado =
      perdido > 0 ? (
        <Estado tono="peligro" icono="💥" etiqueta={`terminó la noche ${vista.noche}`} titulo={<>Perdiste <strong className="dato">{perdido}</strong></>} texto="Mañana será otro día." />
      ) : ganado > 0 ? (
        <Estado tono="bien" icono="🔒" etiqueta={`terminó la noche ${vista.noche}`} titulo={<>Guardaste <strong className="dato">{ganado}</strong></>} texto="Nadie sabe cuánto tenés. Que siga así." />
      ) : (
        <Estado tono="neutro" icono="🌙" etiqueta={`terminó la noche ${vista.noche}`} titulo="Noche en blanco" texto="No guardaste nada, pero tampoco perdiste." />
      );
  } else if (vista.fase === 'decidir' && yo.eleccion !== null) {
    estado = (
      <Estado
        tono={yo.eleccion === 'vuelvo' ? 'calido' : 'neutro'}
        icono="🤫"
        etiqueta="elegiste"
        titulo={yo.eleccion === 'sigo' ? 'Sigo' : 'Me vuelvo'}
        texto="Cara de póker. Mirá la tele."
      />
    );
  } else if (yo.lugar === 'atrapado') {
    estado =
      vista.perdi !== null && vista.perdi > 0 ? (
        <Estado tono="peligro" icono="💥" etiqueta="te agarraron" titulo={<>Perdiste <strong className="dato">{vista.perdi}</strong></>} texto={`Lo que cargabas quedó en el camino. Tu baúl está a salvo.`} />
      ) : (
        <Estado tono="neutro" icono="😮‍💨" etiqueta="te agarraron" titulo="Susto gratis" texto="No llevabas nada encima." />
      );
  } else if (yo.lugar === 'campamento') {
    estado = (
      <Estado tono="calido" icono="🔥" etiqueta="a salvo en el campamento" titulo="Lo tuyo está guardado" texto="Ahora a mirar cómo les va a los demás." />
    );
  } else if (vista.fase === 'presentacion') {
    estado = (
      <Estado tono="neutro" icono="🌙" etiqueta={`noche ${vista.noche} de ${vista.nochesTotales}`} titulo="Todos al camino" texto="Mochila vacía. Mirá la tele." />
    );
  } else {
    estado = (
      <Estado
        tono="neutro"
        icono="🎒"
        etiqueta={`noche ${vista.noche} · en el camino`}
        titulo={vista.compania === 0 ? 'Estás solo' : 'Seguís adentro'}
        texto={vista.compania === 0 ? 'Todo lo que salga es tuyo. Mirá la tele.' : `Con ${vista.compania} más. Mirá la tele.`}
      />
    );
  }

  return (
    <Marco ficha={ficha} derecha={lunas}>
      {estado}
      <Numeros vista={vista} />
    </Marco>
  );
}
