import { useState, type ReactNode } from 'react';

/**
 * Lo que se repite en todas las pantallas del celular: arriba, quién sos (con
 * el color de tu silueta en la tele) y la ayuda; abajo, el contenido.
 *
 * La ayuda vive en la cabecera y no flotando: flotando tapaba la primera línea
 * de cada pantalla.
 */

export function Ficha({ color, nombre }: { color: string; nombre: string }) {
  return (
    <span className="ficha" style={{ '--color-viajero': color } as React.CSSProperties}>
      <span className="ficha-silueta" aria-hidden>
        <span className="ficha-cabeza" />
        <span className="ficha-cuerpo" />
      </span>
      <span className="ficha-nombre">{nombre}</span>
    </span>
  );
}

export function Marco({
  ficha,
  derecha,
  children,
  clase = '',
}: {
  ficha?: { color: string; nombre: string } | undefined;
  derecha?: ReactNode;
  children: ReactNode;
  clase?: string;
}) {
  const [ayuda, setAyuda] = useState(false);
  return (
    <div className={`marco ${clase}`}>
      <header className="cabecera">
        {ficha ? <Ficha color={ficha.color} nombre={ficha.nombre} /> : <span className="cabecera-marca">Sálvese</span>}
        <span className="cabecera-derecha">
          {derecha}
          <button className="boton-ayuda" onClick={() => setAyuda(true)} aria-label="Cómo se juega">
            ?
          </button>
        </span>
      </header>
      <main className="contenido">{children}</main>
      {ayuda && <Ayuda cerrar={() => setAyuda(false)} />}
    </div>
  );
}

function Ayuda({ cerrar }: { cerrar: () => void }) {
  return (
    <div className="modal-overlay" onClick={cerrar}>
      <div className="modal-contenido" role="dialog" aria-label="Cómo se juega" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-titulo">Cómo se juega</h2>
        <ol className="modal-lista-ayuda">
          <li>
            <strong>Cada noche</strong> la tele da vuelta tramos. La plata que aparece se reparte entre los que
            siguen en el camino.
          </li>
          <li>
            <strong>Después de cada tramo</strong> elegís en secreto: <strong>sigo</strong> o{' '}
            <strong>me vuelvo</strong>. Si volvés, guardás lo que cargás en tu baúl.
          </li>
          <li>
            <strong>Si sale dos veces el mismo peligro</strong>, los que siguen pierden todo lo que cargan esa noche.
          </li>
          <li>
            <strong>Lo que sobra</strong> del reparto queda tirado y se lo llevan los próximos que vuelvan. Si volvés
            solo, es todo tuyo.
          </li>
          <li>
            <strong>El perro</strong> olfatea lo que viene. Casi siempre tiene razón.
          </li>
          <li>
            <strong>Gana</strong> el baúl más lleno después de cinco noches.
          </li>
        </ol>
        <button onClick={cerrar}>Entendido</button>
      </div>
    </div>
  );
}
