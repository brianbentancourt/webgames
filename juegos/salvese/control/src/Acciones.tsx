import { useState } from 'react';
import type { Accion } from '@salvese/core';

interface BaseProps {
  onSiguiente: (valor: any) => void;
}

export function PantallaRuta({
  accion,
  onSiguiente,
  tramoMasDuroRevelado,
}: BaseProps & {
  accion: Extract<Accion, { tipo: 'elegir_ruta' }>;
  /** Si el perro volvió de explorar anoche (A2): el tramo más duro de esta noche, sin mentira. */
  tramoMasDuroRevelado?: string | undefined;
}) {
  return (
    <div className="opciones">
      <p className="titulo">EL CAMINO</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Por dónde avanzamos hoy?</p>
      {tramoMasDuroRevelado && (
        <p className="opcion-detalle" style={{ marginBottom: 4 }}>
          El perro volvió y no miente: el tramo más duro de hoy es {tramoMasDuroRevelado}.
        </p>
      )}
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

/**
 * Mandar al perro a explorar (A2, D10). Pantalla propia, independiente de la
 * boleta: el Capataz puede decidir en cualquier momento de la ventana. A
 * diferencia de `repartir_esfuerzo`, acá "no lo mando" es una opción real y
 * no una lista vacía — por eso tiene su propio botón en vez de forzar una
 * confirmación.
 */
export function PantallaMandarPerro({
  onMandar,
  onOmitir,
}: {
  onMandar: () => void;
  onOmitir: () => void;
}) {
  return (
    <div className="opciones" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
      <p className="titulo" style={{ color: 'var(--brasa)' }}>EL PERRO</p>
      <p className="linea">¿Lo mandás a explorar esta noche? Se puede perder.</p>
      <p className="opcion-detalle">Es para decidirlo en voz alta con el grupo.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="boton-primario" onClick={onMandar}>Mandarlo</button>
        <button className="secundario" onClick={onOmitir}>Que se quede</button>
      </div>
    </div>
  );
}

/**
 * El pago del epílogo (A3): el objetivo propio, cumplido o no, y cómo se lee
 * cruzado con si la caravana llegó. Los cuatro cuadrantes se leen distinto a
 * propósito (D21): llegar con la caravana pero fallar lo tuyo no es lo mismo
 * que al revés.
 */
export function PantallaEpilogo({
  desenlace,
}: {
  desenlace: { objetivo: string; cumplido: boolean; llegaron: boolean };
}) {
  const { objetivo, cumplido, llegaron } = desenlace;

  let titulo: string;
  let remate: string;
  if (llegaron && cumplido) {
    titulo = 'LO LOGRASTE';
    remate = 'La caravana llegó, y vos conseguiste lo tuyo.';
  } else if (llegaron && !cumplido) {
    titulo = 'LLEGASTE, PERO...';
    remate = 'La caravana llegó entera. Lo tuyo quedó en el camino.';
  } else if (!llegaron && cumplido) {
    titulo = 'GANASTE VOS, NO EL GRUPO';
    remate = 'La caravana no llegó. Vos conseguiste lo tuyo igual.';
  } else {
    titulo = 'NO ALCANZÓ';
    remate = 'Ni la caravana llegó, ni conseguiste lo tuyo.';
  }

  return (
    <div className="opciones" style={{ marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' }}>
      <p className="titulo" style={{ color: 'var(--brasa)' }}>{titulo}</p>
      <p className="linea" style={{ marginTop: 8 }}>{remate}</p>
      <div className="resumen-boleta" style={{ marginTop: 24, textAlign: 'left' }}>
        <p className="opcion-detalle">Tu objetivo era:</p>
        <p style={{ fontWeight: 600, fontSize: 20 }}>{objetivo}</p>
        <p className="al-pie" style={{ marginTop: 8, color: cumplido ? undefined : 'var(--brasa)' }}>
          {cumplido ? 'Lo cumpliste.' : 'No lo cumpliste.'}
        </p>
      </div>
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

export function PantallaTrato({
  trato,
  onSiguiente,
}: BaseProps & { trato?: { texto: string; costo: string } }) {
  return (
    <div className="opciones" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
      <p className="titulo" style={{ color: 'var(--brasa)' }}>UN TRATO</p>
      <p className="linea" style={{ marginBottom: 12 }}>¿Aceptás el trato?</p>
      {trato && (
        <div style={{ marginBottom: 20 }}>
          <p className="opcion-detalle" style={{ fontSize: 18, color: 'var(--tinta)' }}>{trato.texto}</p>
          <p className="opcion-detalle" style={{ marginTop: 8, color: 'var(--brasa)' }}>Costo: {trato.costo}</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="boton-primario" onClick={() => onSiguiente(true)}>Sí</button>
        <button className="secundario" onClick={() => onSiguiente(false)}>No</button>
      </div>
    </div>
  );
}
