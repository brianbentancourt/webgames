import type { Accion } from '@travesia/core';

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

export function PantallaEsfuerzo({ accion, onSiguiente, nombreDe }: BaseProps & { accion: Extract<Accion, { tipo: 'elegir_esfuerzo' }>, nombreDe: (id: string) => string }) {
  // Para esfuerzo pueden elegirse múltiples hasta el max, pero simplificando
  // el usuario podría elegir a uno o pasar. Como el spec dice "rápido", podemos 
  // mostrar la lista y dejar que elija uno o "Ninguno". 
  // Idealmente mantendría estado local, pero para no sobrecargar, pasamos un array.
  return (
    <div className="opciones">
      <p className="titulo">EL ESFUERZO</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Quién gasta vigor para que la caravana avance más rápido esta noche?</p>
      {accion.opciones.map((id) => (
        <button key={id} className="boton-opcion" onClick={() => onSiguiente([id])}>
          <span className="opcion-nombre">{nombreDe(id)}</span>
        </button>
      ))}
      <button className="boton-opcion" onClick={() => onSiguiente([])}>
        <span className="opcion-nombre">Nadie</span>
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
