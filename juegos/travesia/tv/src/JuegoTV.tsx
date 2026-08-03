import type { VistaTV } from '@travesia/core';
import { ventanaDecidirMs } from '@travesia/core';
import { Fogata } from './Fogata.js';
import { Caravana } from './Caravana.js';

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
          {vista.candidatos.map((c) => (
            <div key={c.id} className="candidato-tarjeta">
              <h3 className="candidato-nombre">{c.nombre}</h3>
              <p className="candidato-pista">{c.pista}</p>
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
            <p className="espera-texto">La travesía terminó. Miren la ronda final.</p>
          )}
        </div>
      )}
    </div>
  );
}
