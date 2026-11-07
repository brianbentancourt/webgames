import type { AvisoPerro, Fase, JugadorTV } from '@salvese/core';
import { colorDeAsiento } from '@salvese/core';

/** La postura del perro reutiliza la escalera de alertas de la estética. */
const POSTURA: Record<AvisoPerro, string> = {
  tranquilo: 'ninguna',
  inquieto: 'inquieto',
  grune: 'no_avanza',
};

function Silueta({ j, fase }: { j: JugadorTV; fase: Fase }) {
  let globo: string | null = null;
  let claseGlobo = '';
  if (fase === 'decidir' && j.lugar === 'camino') {
    globo = j.eligio ? '✓' : '?';
    claseGlobo = j.eligio ? 'globo-listo' : 'globo-duda';
  } else if (fase === 'retirada' && j.eleccion !== null) {
    globo = j.eleccion === 'vuelvo' ? 'ME VUELVO' : 'SIGO';
    claseGlobo = j.eleccion === 'vuelvo' ? 'globo-vuelvo' : 'globo-sigo';
  }

  return (
    <div
      className={`silueta-viajero lugar-${j.lugar} ${j.conectado ? '' : 'desconectado'}`}
      style={{ '--color-viajero': colorDeAsiento(j.asiento) } as React.CSSProperties}
    >
      {globo !== null && <div className={`globo ${claseGlobo}`}>{globo}</div>}
      {j.lugar === 'camino' && <div className="mochila">{j.mochila}</div>}
      <div className="sombra-suelo" />
      <div className="silueta-avatar-sombra">
        <div className="silueta-cabeza" />
        <div className="silueta-avatar" />
      </div>
      <span className="silueta-nombre">{j.nombre}</span>
    </div>
  );
}

/** Lo que "dice" el perro: es el único dato público, así que se ve grande. */
const DICHO: Record<AvisoPerro, string> = {
  tranquilo: 'tranqui',
  inquieto: '¿?',
  grune: '¡grrr!',
};

export function Perro({ aviso }: { aviso: AvisoPerro | null }) {
  return (
    <div className={`silueta-perro alerta-${POSTURA[aviso ?? 'tranquilo']}`}>
      {aviso !== null && <div className={`globo-perro globo-perro-${aviso}`}>{DICHO[aviso]}</div>}
      <div className="sombra-suelo sombra-suelo-perro" />
      <div className="silueta-avatar-sombra silueta-avatar-sombra-perro">
        <div className="silueta-perro-figura">
          <div className="silueta-perro-cuerpo" />
          <div className="silueta-perro-cabeza" />
        </div>
      </div>
      <span className="silueta-nombre">el perro</span>
    </div>
  );
}

/** Los que siguen en el camino, con el perro adelante olfateando. */
export function EnElCamino({ jugadores, fase, perro }: { jugadores: JugadorTV[]; fase: Fase; perro: AvisoPerro | null }) {
  return (
    <div className="grupo grupo-camino">
      {jugadores
        .filter((j) => j.lugar === 'camino' || j.lugar === 'atrapado')
        .map((j) => (
          <Silueta key={j.id} j={j} fase={fase} />
        ))}
      <Perro aviso={perro} />
    </div>
  );
}

/** Los que se volvieron, alrededor del fuego. */
export function EnElCampamento({ jugadores, fase }: { jugadores: JugadorTV[]; fase: Fase }) {
  return (
    <div className="grupo grupo-campamento">
      {jugadores
        .filter((j) => j.lugar === 'campamento')
        .map((j) => (
          <Silueta key={j.id} j={j} fase={fase} />
        ))}
    </div>
  );
}
