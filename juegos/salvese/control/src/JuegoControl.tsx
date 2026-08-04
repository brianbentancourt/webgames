import { useState, useEffect } from 'react';
import type { VistaJugador } from '@salvese/core';
import {
  PantallaRuta,
  PantallaRaciones,
  PantallaEsfuerzo,
  PantallaBloquear,
  PantallaTrato,
  PantallaEntregarObjeto,
} from './Acciones.js';

interface Props {
  vista: VistaJugador;
  mandar: (msg: any) => void;
}

export function JuegoControl({ vista, mandar }: Props) {
  const [paso, setPaso] = useState(0);
  const [boleta, setBoleta] = useState<any>({});

  // Resetear paso si cambia la fase
  useEffect(() => {
    setPaso(0);
    setBoleta({});
  }, [vista.fase, vista.noche]);

  // Si ya tiene una boleta confirmada desde el servidor, mostramos el resumen.
  if (vista.boleta) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <div className="resumen-boleta">
          <p>Decisión bloqueada.</p>
          <p className="al-pie">Mirá la TV para ver el resultado.</p>
        </div>
      </main>
    );
  }

  // Si hay una línea del tutorial, obligar a decirla y mostrar un botón de Continuar
  if (vista.linea && paso === 0) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <p className="linea">{vista.linea}</p>
        <button className="boton-primario" style={{ marginTop: 'auto' }} onClick={() => setPaso(1)}>
          LISTO
        </button>
      </main>
    );
  }

  // Si no hay acciones pendientes para él, mostrar "esperá / hablá"
  if (vista.acciones.length === 0) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <p className="linea">No te toca ninguna acción. Hablá con el grupo.</p>
        {vista.revelacion && (
          <div className="revelacion" style={{ marginTop: 20 }}>
            <p className="titulo">INFORMACIÓN SECRETA</p>
            {vista.revelacion.tipo === 'terreno' && <p>{vista.revelacion.texto}</p>}
            {vista.revelacion.tipo === 'gente' && (
              <ul className="lista-revelacion">
                {vista.revelacion.filas.map((f, i) => (
                  <li key={i}>{f.nombre}: {f.estado}</li>
                ))}
              </ul>
            )}
            {vista.revelacion.tipo === 'inventario' && (
              <p>Quedan {vista.revelacion.recurso} de {vista.revelacion.capacidad} {vista.revelacion.nombreRecurso}.</p>
            )}
            {vista.revelacion.tipo === 'registro' && <p>{vista.revelacion.texto}</p>}
            {vista.revelacion.tipo === 'mando' && <p>{vista.revelacion.texto}</p>}
          </div>
        )}
      </main>
    );
  }

  // Flujo normal de acciones (wizard)
  const indiceAccion = vista.linea ? paso - 1 : paso;
  const accionActual = vista.acciones[indiceAccion];

  if (!accionActual) {
    // Ya completó todo localmente pero no bloqueó (o esperando respuesta de server)
    return (
      <main className="pantalla">
        <p className="titulo">Enviando...</p>
      </main>
    );
  }

  const handleSiguiente = (key: string, valor: any) => {
    const nuevaBoleta = { ...boleta, [key]: valor };
    setBoleta(nuevaBoleta);

    // Si es acción directa (ej: votar_tablero, responder_trato, elegir, bloquear)
    if (accionActual.tipo === 'responder_trato') {
      mandar({ t: 'responder_trato', acepta: valor });
      setPaso(paso + 1);
    } else if (accionActual.tipo === 'votar_tablero') {
      mandar({ t: 'votar_tablero', tablero: valor });
      setPaso(paso + 1);
    } else if (accionActual.tipo === 'entregar_objeto') {
      mandar({ t: 'entregar_objeto', objeto: accionActual.objeto, a: valor });
      setPaso(paso + 1);
    } else if (accionActual.tipo === 'bloquear') {
      mandar({ 
        t: 'elegir', 
        ruta: nuevaBoleta.ruta, 
        raciones: nuevaBoleta.raciones, 
        esfuerzo: nuevaBoleta.esfuerzo 
      });
      mandar({ t: 'bloquear' });
      setPaso(paso + 1);
    } else {
      // Avanzar al siguiente paso del wizard local
      setPaso(paso + 1);
    }
  };

  return (
    <main className="pantalla">
      <p className="titulo">{vista.yo.nombre}</p>

      {accionActual.tipo === 'elegir_ruta' && (
        <PantallaRuta accion={accionActual as any} onSiguiente={(v) => handleSiguiente('ruta', v)} />
      )}
      {accionActual.tipo === 'elegir_raciones' && (
        <PantallaRaciones accion={accionActual as any} onSiguiente={(v) => handleSiguiente('raciones', v)} />
      )}
      {accionActual.tipo === 'elegir_esfuerzo' && (
        <PantallaEsfuerzo accion={accionActual as any} onSiguiente={(v) => handleSiguiente('esfuerzo', v)} />
      )}
      {accionActual.tipo === 'bloquear' && (
        <PantallaBloquear onSiguiente={(v) => handleSiguiente('bloquear', v)} />
      )}
      {accionActual.tipo === 'responder_trato' && (
        <PantallaTrato onSiguiente={(v) => handleSiguiente('trato', v)} />
      )}
      {accionActual.tipo === 'entregar_objeto' && (
        <PantallaEntregarObjeto
          accion={accionActual as any}
          onEntregar={(v) => handleSiguiente('entregar_objeto', v)}
          onOmitir={() => setPaso(paso + 1)}
        />
      )}
    </main>
  );
}
