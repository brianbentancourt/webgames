import type { ViajeroPublico } from '@salvese/core';

interface Props {
  viajeros: ViajeroPublico[];
  perro: { presente: boolean; alerta: string; explorando?: boolean };
  /**
   * Qué gatillo de alerta está activo, si hay alguno (08-cliente-tv.md § Tres
   * niveles de animación). El gatillo no dice a quién le pasó — pulsa a todo
   * viajero que hoy está en el estado correspondiente, que es la aproximación
   * más simple que sigue siendo correcta: el que se quebró está `quebrado`, el
   * que encontró algo lo está cargando.
   */
  alertaQue?: 'objeto' | 'quiebre' | 'perro';
}

export function Caravana({ viajeros, perro, alertaQue }: Props) {
  return (
    <div className="caravana-container">
      {viajeros.map((v) => {
        const animar =
          (alertaQue === 'quiebre' && v.aspecto === 'quebrado') ||
          (alertaQue === 'objeto' && v.cargaObjeto);
        return (
          <div
            key={v.id}
            className={`silueta-viajero estado-${v.aspecto} ${v.bloqueo === 'listo' ? 'bloqueado' : ''} ${animar ? 'animar-alerta' : ''}`}
          >
            <div className="sombra-suelo" />
            <div className="silueta-avatar-sombra">
              <div className="silueta-cabeza" />
              <div className="silueta-avatar" />
            </div>
            <div className="silueta-info">
              <span className="silueta-nombre">{v.nombre}</span>
              {v.cargaObjeto && <span className="silueta-carga">📦</span>}
            </div>
            {v.bloqueo === 'listo' && <div className="indicador-listo" />}
          </div>
        );
      })}

      {/*
        Mientras explora sigue `presente` —el riesgo se resuelve al cerrar la
        noche— pero no está junto al fuego, así que se dibuja como ausencia y
        no en su postura normal: seguir mostrándolo echado sería mentir sobre
        lo único público que tiene el juego (D10, A2).
      */}
      {perro.presente && (
        <div
          className={`silueta-perro alerta-${perro.alerta} ${perro.explorando ? 'perro-explorando' : ''} ${alertaQue === 'perro' ? 'animar-alerta' : ''}`}
        >
          <div className="sombra-suelo sombra-suelo-perro" />
          <div className="silueta-avatar-sombra silueta-avatar-sombra-perro">
            <div className="silueta-perro-figura">
              <div className="silueta-perro-cuerpo" />
              <div className="silueta-perro-cabeza" />
            </div>
          </div>
          <span className="silueta-nombre">{perro.explorando ? 'salió' : 'Perro'}</span>
        </div>
      )}
    </div>
  );
}
