import type { ViajeroPublico } from '@travesia/core';

interface Props {
  viajeros: ViajeroPublico[];
  perro: { presente: boolean; alerta: string };
  /** Gatillo de alerta del perro (D4): la pausa de 1-2s que puede interrumpir la charla. */
  alertando?: boolean;
}

export function Caravana({ viajeros, perro, alertando }: Props) {
  return (
    <div className="caravana-container">
      {viajeros.map((v) => (
        <div key={v.id} className={`silueta-viajero estado-${v.aspecto} ${v.bloqueo === 'listo' ? 'bloqueado' : ''}`}>
          <div className="silueta-avatar-sombra">
            <div className="silueta-avatar" />
          </div>
          <div className="silueta-info">
            <span className="silueta-nombre">{v.nombre}</span>
            {v.cargaObjeto && <span className="silueta-carga">📦</span>}
          </div>
          {v.bloqueo === 'listo' && <div className="indicador-listo" />}
        </div>
      ))}
      
      {perro.presente && (
        <div className={`silueta-perro alerta-${perro.alerta} ${alertando ? 'animar-alerta' : ''}`}>
          <div className="silueta-avatar-sombra">
            <div className="silueta-avatar-perro" />
          </div>
          <span className="silueta-nombre">Perro</span>
        </div>
      )}
    </div>
  );
}
