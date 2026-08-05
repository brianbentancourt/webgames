import { useState, useEffect } from 'react';
import type { VistaJugador } from '@salvese/core';
import {
  PantallaRuta,
  PantallaRaciones,
  PantallaRepartirEsfuerzo,
  PantallaMandarPerro,
  PantallaEpilogo,
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
  // "No lo mando" es una decisión real (A2), no una lista vacía como en el
  // esfuerzo: no hay nada que mandarle al servidor para registrarla, así que
  // vive acá nomás. Se resetea con lo demás al cambiar de noche — si el
  // Capataz recarga antes de decidir, es correcto que la pantalla vuelva.

  // Resetear paso si cambia la fase o la noche
  useEffect(() => {
    setPaso(0);
    setBoleta({});
  }, [vista.fase, vista.noche]);

  // El pago del epílogo (A3): pantalla propia, sin wizard. Antes de esto acá
  // caía en el genérico "no te toca ninguna acción" de más abajo, que es
  // justo el problema que describe el plan: la persona que más le prestó
  // atención a su rol era la que menos se enteraba de cómo terminó.
  if (vista.fase === 'epilogo' && vista.miDesenlace) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <PantallaEpilogo desenlace={vista.miDesenlace} />
      </main>
    );
  }

  // El reparto del esfuerzo es independiente de la boleta (D19): no depende
  // de haber bloqueado ruta y raciones, ni al revés. Por eso se resuelve acá,
  // antes que el wizard de la boleta y con su propia pantalla, en vez de ser
  // un paso más del array `acciones`.
  //
  // Si ya repartió, la pantalla no se fuerza más: eso lo dice el servidor con
  // `yaReparti`, no un `useState` local. Con estado local se perdía al recargar
  // el celular y el Capataz volvía a ver la pantalla de reparto a mitad de la
  // noche, pudiendo pisar sin querer lo que ya había decidido.
  const accionEsfuerzo = vista.acciones.find((a) => a.tipo === 'repartir_esfuerzo');
  if (accionEsfuerzo && accionEsfuerzo.tipo === 'repartir_esfuerzo' && !accionEsfuerzo.yaReparti) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <PantallaRepartirEsfuerzo
          accion={accionEsfuerzo}
          onConfirmar={(ids) => mandar({ t: 'asignar_esfuerzo', a: ids })}
        />
      </main>
    );
  }

  // Mandar al perro a explorar (A2, D10): pantalla propia, antes del wizard,
  // igual que el reparto del esfuerzo de arriba — y con el mismo criterio,
  // que es lo que importa: "que se quede" también se le manda al servidor y
  // la pantalla se apaga con `yaDecidio`, no con un `useState` local. Con
  // estado local, decir que no y después recargar el celular hacía volver la
  // pantalla a mitad de la noche (D4: el estado vive en el servidor).
  const accionPerro = vista.acciones.find((a) => a.tipo === 'mandar_perro');
  if (accionPerro && accionPerro.tipo === 'mandar_perro' && !accionPerro.yaDecidio) {
    return (
      <main className="pantalla">
        <p className="titulo">{vista.yo.nombre}</p>
        <PantallaMandarPerro
          onMandar={() => mandar({ t: 'mandar_perro_a_explorar', manda: true })}
          onOmitir={() => mandar({ t: 'mandar_perro_a_explorar', manda: false })}
        />
      </main>
    );
  }

  // Si ya tiene una boleta confirmada desde el servidor y no queda pendiente
  // más que el reparto del esfuerzo o mandar al perro (ya resueltos arriba),
  // mostramos el resumen.
  if (
    vista.boleta &&
    vista.acciones.every((a) => a.tipo === 'repartir_esfuerzo' || a.tipo === 'mandar_perro')
  ) {
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

  // El reparto del esfuerzo y mandar al perro ya se resolvieron arriba (con
  // su propia pantalla, si correspondía): de acá para abajo el wizard
  // trabaja solo con el resto.
  const accionesSinEsfuerzo = vista.acciones.filter(
    (a) => a.tipo !== 'repartir_esfuerzo' && a.tipo !== 'mandar_perro',
  );

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
  if (accionesSinEsfuerzo.length === 0) {
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
  const accionActual = accionesSinEsfuerzo[indiceAccion];

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
        <PantallaRuta
          accion={accionActual as any}
          onSiguiente={(v) => handleSiguiente('ruta', v)}
          tramoMasDuroRevelado={vista.perroTramoRevelado}
        />
      )}
      {accionActual.tipo === 'elegir_raciones' && (
        <PantallaRaciones accion={accionActual as any} onSiguiente={(v) => handleSiguiente('raciones', v)} />
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
