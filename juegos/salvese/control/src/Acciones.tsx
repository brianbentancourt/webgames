import { useState } from 'react';
import type { Accion } from '@salvese/core';

interface BaseProps {
  onSiguiente: (valor: any) => void;
}

export function PantallaRuta({ accion, onSiguiente }: BaseProps & { accion: Extract<Accion, { tipo: 'elegir_ruta' }> }) {
  return (
    <div className="opciones">
      <p className="titulo">EL CAMINO</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Por dónde avanzamos hoy?</p>
      {accion.opciones.map((o) => (
        <button key={o.id} className="boton-opcion" onClick={() => onSiguiente(o.id)}>
          <span className="opcion-nombre">{o.nombre}</span>
          <span className="opcion-detalle">{o.pista}</span>
        </button>
      ))}
    </div>
  );
}

export function PantallaRaciones({ accion, onSiguiente }: BaseProps & { accion: Extract<Accion, { tipo: 'elegir_raciones' }> }) {
  return (
    <div className="opciones">
      <p className="titulo">RACIONES</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Cuánta comida gastamos hoy?</p>
      {accion.opciones.map((r) => (
        <button key={r} className="boton-opcion" onClick={() => onSiguiente(r)}>
          <span className="opcion-nombre">{r}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * El reparto del trabajo pesado (D19). Selección múltiple hasta `max`, con
 * confirmar: independiente de la boleta, así que puede aparecer aunque ya se
 * haya bloqueado ruta y raciones (ver `JuegoControl.tsx`).
 *
 * Los que no se pueden elegir se muestran igual, deshabilitados con su
 * `motivo`: que se vea por qué no se puede es parte de la conversación, no
 * algo para esconder.
 */
export function PantallaRepartirEsfuerzo({
  accion,
  onConfirmar,
}: {
  accion: Extract<Accion, { tipo: 'repartir_esfuerzo' }>;
  onConfirmar: (ids: string[]) => void;
}) {
  // Arranca en lo que ya está asignado del lado del servidor, no vacío: si el
  // celular se recargó a mitad de la noche, esta pantalla tiene que volver
  // mostrando lo que ya se repartió y no una selección en blanco (D4).
  const [seleccion, setSeleccion] = useState<string[]>(accion.yaAsignado);

  const alternar = (id: string) => {
    setSeleccion((actual) => {
      if (actual.includes(id)) return actual.filter((x) => x !== id);
      if (actual.length >= accion.max) return actual;
      return [...actual, id];
    });
  };

  const esVoluntario = accion.modo === 'voluntario';

  return (
    <div className="opciones">
      <p className="titulo">EL TRABAJO PESADO</p>
      <p className="linea" style={{ marginBottom: 12 }}>
        {esVoluntario
          ? '¿Te ofrecés al trabajo pesado esta noche? Gastás vigor, la caravana avanza más.'
          : `¿A quién mandás al trabajo pesado esta noche? Hasta ${accion.max}.`}
      </p>
      {accion.opciones.map((o) => (
        <button
          key={o.id}
          className={`boton-opcion ${seleccion.includes(o.id) ? 'seleccionado' : ''}`}
          disabled={!o.disponible}
          onClick={() => alternar(o.id)}
        >
          <span className="opcion-nombre">{esVoluntario ? 'Me ofrezco' : o.nombre}</span>
          {!o.disponible && o.motivo && <span className="opcion-detalle">{o.motivo}</span>}
        </button>
      ))}
      <button className="boton-primario" style={{ marginTop: 20 }} onClick={() => onConfirmar(seleccion)}>
        {accion.yaReparti ? 'CAMBIAR' : 'CONFIRMAR'}
      </button>
    </div>
  );
}

export function PantallaEntregarObjeto({
  accion,
  onEntregar,
  onOmitir,
}: {
  accion: Extract<Accion, { tipo: 'entregar_objeto' }>;
  onEntregar: (id: string) => void;
  onOmitir: () => void;
}) {
  return (
    <div className="opciones">
      <p className="titulo">EL OBJETO</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Se lo pasás a alguien, o te lo quedás?</p>
      {accion.candidatos.map((c) => (
        <button key={c.id} className="boton-opcion" onClick={() => onEntregar(c.id)}>
          <span className="opcion-nombre">Dárselo a {c.nombre}</span>
        </button>
      ))}
      <button className="boton-opcion secundario" onClick={onOmitir}>
        <span className="opcion-nombre">Me lo quedo</span>
      </button>
    </div>
  );
}

export function PantallaBloquear({ onSiguiente }: BaseProps) {
  return (
    <div className="opciones" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
      <p className="linea-grande" style={{ textAlign: 'center' }}>¿Todo listo?</p>
      <button className="boton-primario" style={{ marginTop: 20 }} onClick={() => onSiguiente(true)}>
        BLOQUEAR BOLETA
      </button>
    </div>
  );
}

export function PantallaTrato({ onSiguiente }: BaseProps) {
  return (
    <div className="opciones" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
      <p className="titulo" style={{ color: 'var(--brasa)' }}>UN TRATO</p>
      <p className="linea">¿Aceptás el trato?</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="boton-primario" onClick={() => onSiguiente(true)}>Sí</button>
        <button className="secundario" onClick={() => onSiguiente(false)}>No</button>
      </div>
    </div>
  );
}
