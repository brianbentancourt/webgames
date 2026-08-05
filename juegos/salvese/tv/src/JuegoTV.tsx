import type { VistaTV, RevelacionBoletas } from '@salvese/core';
import { ventanaDecidirMs } from '@salvese/core';
import { Fogata } from './Fogata.js';
import { Caravana } from './Caravana.js';

/**
 * Quién votó qué, con nombre (D18). Se usa en el fogón y también en el epílogo:
 * cuando la partida termina, la máquina va de `resolver` directo a `epilogo`
 * salteando `fogon`, así que sin esto las boletas de la última noche —la 5, la
 * que el Capataz decide solo— no las vería nadie nunca.
 */
function Revelacion({ rev, compacto = false }: { rev: RevelacionBoletas; compacto?: boolean }) {
  return (
    <div className={compacto ? 'revelacion revelacion-compacta' : 'revelacion'}>
      <div className="fogon-columnas">
        <div className="fogon-columna">
          <h3 className="fogon-encabezado">LA RUTA</h3>
          <ul className="fogon-lista">
            {rev.ruta.map((r) => (
              <li key={r.nombre} className={r.gano ? 'fogon-fila fogon-fila-gano' : 'fogon-fila'}>
                <span className="fogon-opcion">{r.nombre}</span>
                <span className="fogon-votantes">
                  {r.votantes.length > 0 ? r.votantes.join(' · ') : 'nadie votó esto'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="fogon-columna">
          <h3 className="fogon-encabezado">RACIONES</h3>
          <ul className="fogon-lista">
            {rev.raciones.map((r) => (
              <li key={r.nivel} className={r.gano ? 'fogon-fila fogon-fila-gano' : 'fogon-fila'}>
                <span className="fogon-opcion">{r.nivel}</span>
                <span className="fogon-votantes">
                  {r.votantes.length > 0 ? r.votantes.join(' · ') : 'nadie votó esto'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="fogon-esfuerzo">
        <h3 className="fogon-encabezado">EL TRABAJO PESADO</h3>
        <p className="fogon-esfuerzo-texto">
          {rev.esfuerzo.length > 0 ? rev.esfuerzo.join(' · ') : 'No fue nadie.'}
          {rev.repartio ? ` — los mandó ${rev.repartio}` : ''}
        </p>
      </div>
    </div>
  );
}

export function JuegoTV({ vista }: { vista: VistaTV }) {
  const { paleta } = vista.tablero;

  // La TV no calcula el tiempo restante contra su propio reloj más que para
  // interpolar los dígitos: `reloj` es fracción de la ventana de `decidir`,
  // que se calcula igual que en el servidor (ventanaDecidirMs).
  const segundos = vista.mostrarDigitos
    ? Math.ceil((vista.reloj * ventanaDecidirMs(vista.noche)) / 1000)
    : undefined;

  // El gatillo dice si toca animar, nunca se infiere comparando estados (D4).
  const gatilloResolucion = vista.gatillos.find((g) => g.tipo === 'resolucion');
  const gatilloAlerta = vista.gatillos.find((g) => g.tipo === 'alerta');

  return (
    <div
      className={`juego-tv fase-${vista.fase}`}
      style={{
        '--cielo': paleta.cielo,
        '--cerro-lejano': paleta.cerroLejano,
        '--cerro-medio': paleta.cerroMedio,
        '--cerro-cercano': paleta.cerroCercano,
        '--brasa': paleta.brasa,
      } as React.CSSProperties}
    >
      <div className="fondo-capa capa-cielo" />
      <div className="capa-sombra"><div className="fondo-capa capa-lejano" /></div>
      <div className="capa-sombra"><div className="fondo-capa capa-medio" /></div>
      <div className="capa-sombra"><div className="fondo-capa capa-cercano" /></div>

      {/*
        Librería estática de fondos (07-capa-llm.md): si el archivo no existe
        todavía, `background-image` no carga nada y quedan visibles las capas
        de degradé de arriba — no hace falta lógica de respaldo aparte.
      */}
      <div className="capa-estrellas" />
      <div
        className="fondo-ilustrado"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.4), rgba(0,0,0,.1) 35%, rgba(0,0,0,.6)), url("${import.meta.env.BASE_URL}fondos/${vista.tablero.fondo}.jpg")`,
        }}
      />
      
      <div className="textura-papel" />
      <div 
        className="vignette-fuego" 
        style={{
          /* A menor reloj, menor luz, por lo tanto la viñeta (oscuridad) cubre más */
          background: `radial-gradient(circle at 50% 80%, transparent ${30 + vista.reloj * 20}%, rgba(0,0,0,${0.9 - vista.reloj * 0.4}) 100%)`,
        }}
      />

      <div className="ui-superior">
        <h2 className="noche-indicador">Noche {vista.noche} de {vista.nochesTotales}</h2>
        <h1 className="tablero-nombre">{vista.tablero.nombre}</h1>
      </div>

      <div className="escenario">
        <Caravana
          viajeros={vista.viajeros}
          perro={vista.perro}
          {...(gatilloAlerta ? { alertaQue: gatilloAlerta.que } : {})}
        />
        <Fogata reloj={vista.reloj} mostrarDigitos={vista.mostrarDigitos} segundos={segundos} />
      </div>

      {(vista.fase === 'reparto' || vista.fase === 'lobby') && (
        <div className="panel-espera">
          <p className="espera-texto">La caravana se prepara para partir.</p>
        </div>
      )}

      {vista.fase === 'decidir' && vista.candidatos.length > 0 && (
        <div className="panel-candidatos">
          {/*
            Lo que trajo el perro (A2) se marca sobre el tramo, no en un cartel
            aparte: la información aparece pegada a la decisión que modifica, y
            es pública porque el perro es el único dato público del juego (D10).
          */}
          {vista.candidatos.map((c) => (
            <div
              key={c.id}
              className={
                vista.perro.tramoRevelado === c.nombre
                  ? 'candidato-tarjeta candidato-marcado'
                  : 'candidato-tarjeta'
              }
            >
              <h3 className="candidato-nombre">{c.nombre}</h3>
              <p className="candidato-pista">{c.pista}</p>
              {vista.perro.tramoRevelado === c.nombre && (
                <p className="candidato-perro">el perro no quiso pasar por acá</p>
              )}
            </div>
          ))}
        </div>
      )}

      {vista.fase === 'resolver' && vista.ultimaCronica && (
        <div
          key={`${vista.noche}-resolver`}
          className="panel-resolucion animar-resolucion"
          style={
            gatilloResolucion
              ? ({ '--duracion-resolucion': `${gatilloResolucion.duracionMs}ms` } as React.CSSProperties)
              : undefined
          }
        >
          <p className="cronica-texto">{vista.ultimaCronica.relato}</p>
        </div>
      )}

      {vista.fase === 'fogon' && vista.revelacion && (
        <div className="panel-fogon">
          <h2 className="fogon-titulo">Noche {vista.revelacion.noche}: lo que pasó</h2>
          <Revelacion rev={vista.revelacion} />
        </div>
      )}

      {vista.fase === 'epilogo' && (
        <div className="panel-epilogo">
          {vista.desenlace ? (
            <>
              <h2 className="epilogo-titulo">
                {vista.desenlace.llegaron ? 'Llegaron a destino.' : 'No llegaron a destino.'}
              </h2>
              <p className="epilogo-perro">
                {vista.desenlace.perroLlego ? 'El perro llegó con ellos.' : 'El perro se perdió en el camino.'}
              </p>
              {vista.ultimaCronica && <p className="cronica-texto">{vista.ultimaCronica.relato}</p>}
              {/*
                La última noche no pasa por el fogón —la máquina va de `resolver`
                directo a `epilogo`— así que su revelación se muestra acá o no se
                muestra nunca. Es justo la boleta más jugosa de la partida.
              */}
              {vista.revelacion && (
                <div className="epilogo-revelacion">
                  <h3 className="epilogo-subtitulo">La última noche</h3>
                  <Revelacion rev={vista.revelacion} compacto />
                </div>
              )}
              <ul className="epilogo-objetivos">
                {vista.desenlace.objetivos.map((o) => (
                  <li key={o.jugador} className={o.cumplido ? 'objetivo-cumplido' : 'objetivo-fallado'}>
                    <span className="objetivo-nombre">{o.nombre}</span>
                    <span className="objetivo-texto">{o.texto}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="espera-texto">Sálvese quien pueda! terminó. Miren la ronda final.</p>
          )}
        </div>
      )}
    </div>
  );
}
