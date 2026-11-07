import type { CartaTV, VistaTV } from '@salvese/core';
import { TIEMPOS } from '@salvese/core';
import { Fogata } from './Fogata.js';
import { EnElCamino, EnElCampamento } from './Caravana.js';
import { useRestante } from './reloj.js';

/**
 * El tablero. Se mira de reojo desde el sillón: arriba lo que pasa, en el medio
 * el camino que se va dando vuelta, abajo la gente — a la izquierda los que ya
 * están a salvo junto al fuego, a la derecha los que siguen arriesgando.
 */

const lista = (nombres: string[]) =>
  nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;

function Carta({ carta, nueva, tesoro }: { carta: CartaTV; nueva: boolean; tesoro: string }) {
  if (carta.t === 'hallazgo') {
    return (
      <div className={`carta carta-hallazgo ${nueva ? 'carta-nueva' : ''}`}>
        <span className="carta-valor">{carta.valor}</span>
        <span className="carta-nombre">{carta.nombre}</span>
        {carta.resto > 0 && (
          <span className="carta-resto" title={`${carta.resto} de ${tesoro} tirados`}>
            {carta.resto} tirado{carta.resto === 1 ? '' : 's'}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={`carta carta-peligro ${carta.repetido ? 'carta-letal' : ''} ${nueva ? 'carta-nueva' : ''}`}>
      <span className="carta-icono">{carta.icono}</span>
      <span className="carta-nombre">{carta.nombre}</span>
    </div>
  );
}

function Cartel({ vista, segundos }: { vista: VistaTV; segundos: number | null }) {
  const ultima = vista.camino.at(-1);
  const enCamino = vista.jugadores.filter((j) => j.lugar === 'camino').length;

  switch (vista.fase) {
    case 'presentacion':
      return (
        <div className="cartel cartel-grande" key={`p${vista.paso}`}>
          <p className="cartel-titulo">Noche {vista.noche}</p>
          {vista.noche === 1 ? (
            <p className="cartel-texto">
              Se da vuelta un tramo por vez. Después de cada uno, cada cual elige en el celu:
              <strong> sigo</strong> o <strong>me vuelvo</strong> con lo que carga.
              <br />
              Si sale <strong>dos veces el mismo peligro</strong>, los que siguen pierden todo.
            </p>
          ) : (
            <p className="cartel-texto">Todos de vuelta al camino, con la mochila vacía.</p>
          )}
        </div>
      );

    case 'revelar':
      if (ultima?.t === 'hallazgo') {
        const cadaUno = Math.floor(ultima.valor / Math.max(1, enCamino));
        return (
          <div className="cartel" key={`r${vista.paso}`}>
            <p className="cartel-titulo">{ultima.nombre}</p>
            {cadaUno > 0 ? (
              <p className="cartel-texto">
                <strong className="numero">{cadaUno}</strong> de {vista.tablero.tesoro} para cada uno
                {ultima.resto === 1 ? ' · 1 queda tirado' : ultima.resto > 1 ? ` · ${ultima.resto} quedan tirados` : ''}
              </p>
            ) : (
              <p className="cartel-texto">
                No alcanza para repartir: <strong className="numero">{ultima.resto}</strong> quedan tirados para el que vuelva.
              </p>
            )}
          </div>
        );
      }
      return (
        <div className="cartel cartel-susto" key={`r${vista.paso}`}>
          <p className="cartel-titulo">
            {ultima?.t === 'peligro' ? ultima.icono : ''} {ultima?.t === 'peligro' ? ultima.nombre : ''}
          </p>
          <p className="cartel-texto">{vista.relato}</p>
          <p className="cartel-aviso">Si vuelve a salir, los que estén en el camino pierden todo.</p>
        </div>
      );

    case 'decidir': {
      const faltan = vista.jugadores.filter((j) => j.lugar === 'camino' && !j.eligio).length;
      return (
        <div className="cartel cartel-decidir">
          <p className="cartel-titulo">¿Siguen o se vuelven?</p>
          <p className="cartel-texto">
            {faltan === 0 ? 'ya está' : faltan === 1 ? 'falta uno' : `faltan ${faltan}`}
            {vista.tirado > 0 ? ` · ${vista.tirado} tirado${vista.tirado === 1 ? '' : 's'} para el que vuelva` : ''}
          </p>
          {segundos !== null && (
            <p className={`cuenta ${segundos <= 5 ? 'cuenta-urgente' : ''}`}>{Math.ceil(segundos)}</p>
          )}
        </div>
      );
    }

    case 'retirada': {
      const r = vista.retirada;
      if (r === null) return null;
      return (
        <div className="cartel cartel-retirada" key={`t${vista.paso}`}>
          {r.volvieron.length === 0 ? (
            <p className="cartel-titulo">Nadie se vuelve.</p>
          ) : (
            <>
              <p className="cartel-titulo">Se vuelve{r.volvieron.length > 1 ? 'n' : ''} {lista(r.volvieron)}</p>
              {r.cadaUno > 0 && (
                <p className="cartel-texto">
                  {r.volvieron.length === 1 ? 'y se lleva' : 'y se llevan'} <strong className="numero">{r.cadaUno}</strong>{' '}
                  de lo tirado{r.volvieron.length > 1 ? ' cada uno' : ''}
                </p>
              )}
            </>
          )}
          {r.siguieron.length > 0 && (
            <p className="cartel-texto">
              {r.siguieron.length === 1 ? 'Sigue' : 'Siguen'} {lista(r.siguieron)}
              {r.siguieron.length === 1 ? ', solo' : ''}.
            </p>
          )}
          {r.callados.length > 0 && (
            <p className="cartel-aviso">
              {lista(r.callados)} no {r.callados.length === 1 ? 'eligió' : 'eligieron'} a tiempo: {r.callados.length === 1 ? 'sigue' : 'siguen'}.
            </p>
          )}
        </div>
      );
    }

    case 'emboscada': {
      const e = vista.emboscada;
      if (e === null) return null;
      const perdidas = e.perdieron.filter((p) => p.cuanto > 0);
      return (
        <div className="cartel cartel-emboscada" key={`e${vista.paso}`}>
          <p className="cartel-icono-grande">{e.icono}</p>
          <p className="cartel-titulo">¡Otra vez {e.nombre}!</p>
          <p className="cartel-texto">{vista.relato}</p>
          {perdidas.length > 0 ? (
            <ul className="lista-perdidas">
              {perdidas.map((p) => (
                <li key={p.nombre}>
                  {p.nombre} <strong>−{p.cuanto}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cartel-aviso">No llevaban nada. Susto gratis.</p>
          )}
        </div>
      );
    }

    case 'fin_noche': {
      const r = vista.resumenNoche;
      if (r === null) return null;
      const titular =
        r.motivo === 'emboscada'
          ? `Noche ${r.noche}: los agarró ${r.peligro ?? 'el camino'}.`
          : r.motivo === 'sin_cartas'
            ? `Noche ${r.noche}: se terminó el camino.`
            : `Noche ${r.noche}: volvieron todos.`;
      return (
        <div className="cartel cartel-balance" key={`f${vista.paso}`}>
          <p className="cartel-titulo">{titular}</p>
          <ul className="balance">
            {[...r.filas]
              .sort((a, b) => b.ganado - b.perdido - (a.ganado - a.perdido))
              .map((f) => (
                <li key={f.nombre} className={f.perdido > 0 ? 'balance-perdio' : f.ganado > 0 ? 'balance-gano' : ''}>
                  <span>{f.nombre}</span>
                  <strong>{f.perdido > 0 ? `perdió ${f.perdido}` : f.ganado > 0 ? `+${f.ganado}` : 'nada'}</strong>
                </li>
              ))}
          </ul>
          <p className="cartel-aviso">
            {vista.noche < vista.nochesTotales
              ? `Lo que guardó cada uno es secreto. Quedan ${vista.nochesTotales - vista.noche}.`
              : 'Esa fue la última. Ahora se abren los baúles.'}
          </p>
        </div>
      );
    }

    case 'final':
      return null;
  }
}

function Final({ vista }: { vista: VistaTV }) {
  const f = vista.final;
  if (f === null) return null;
  const ganadores = f.ranking.filter((p) => p.puesto === 1);
  return (
    <div className="panel-final">
      <p className="final-sobre">se abren los baúles</p>
      <h2 className="final-titulo">
        {ganadores.length === 1 ? `Ganó ${ganadores[0]!.nombre}` : `Empate: ${lista(ganadores.map((g) => g.nombre))}`}
      </h2>
      <ol className="podio">
        {f.ranking.map((p, i) => (
          <li
            key={p.jugador}
            className={`podio-fila ${p.puesto === 1 ? 'podio-primero' : ''}`}
            style={{ animationDelay: `${(f.ranking.length - 1 - i) * 450}ms` } as React.CSSProperties}
          >
            <span className="podio-puesto">{p.puesto}</span>
            <span className="podio-nombre">{p.nombre}</span>
            <span className="podio-baul">
              {p.baul} <small>de {vista.tablero.tesoro}</small>
            </span>
          </li>
        ))}
      </ol>
      {f.premios.length > 0 && (
        <ul className="premios">
          {f.premios.map((p) => (
            <li key={p.titulo} className="premio">
              <span className="premio-titulo">{p.titulo}</span>
              <span className="premio-jugador">{p.nombre}</span>
              <span className="premio-detalle">{p.detalle}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="final-pie">¿Otra? Cualquiera la pide desde el celular.</p>
    </div>
  );
}

export function JuegoTV({ vista, codigo }: { vista: VistaTV; codigo?: string | null }) {
  const { paleta } = vista.tablero;
  const segundos = useRestante(vista.restanteMs, vista.paso);
  // El fuego del campamento es el reloj de la decisión: se apaga mientras se piensa.
  const reloj = vista.fase === 'decidir' && segundos !== null ? Math.min(1, segundos / (TIEMPOS.decidirMs / 1000)) : 1;
  const ultimaId = vista.fase === 'revelar' || vista.fase === 'emboscada' ? vista.camino.at(-1)?.id : undefined;

  return (
    <div
      className={`juego-tv fase-${vista.fase}`}
      style={
        {
          '--cielo': paleta.cielo,
          '--cerro-lejano': paleta.cerroLejano,
          '--cerro-medio': paleta.cerroMedio,
          '--cerro-cercano': paleta.cerroCercano,
          '--brasa': paleta.brasa,
          '--cartas': Math.max(vista.camino.length, 8),
        } as React.CSSProperties
      }
    >
      <div className="fondo-capa capa-cielo" />
      <div className="capa-sombra"><div className="fondo-capa capa-lejano" /></div>
      <div className="capa-sombra"><div className="fondo-capa capa-medio" /></div>
      <div className="capa-sombra"><div className="fondo-capa capa-cercano" /></div>
      <div className="capa-estrellas" />
      {/* Si el archivo no está, quedan las capas de degradé: no hace falta respaldo aparte. */}
      <div
        className="fondo-ilustrado"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,.2) 40%, rgba(0,0,0,.7)), url("${import.meta.env.BASE_URL}fondos/${vista.tablero.fondo}.jpg")`,
        }}
      />
      <div className="textura-papel" />

      <header className="barra">
        <div>
          <h1 className="barra-tablero">{vista.tablero.nombre}</h1>
          {vista.fase === 'final' ? (
            <p className="barra-noche">fin de la travesía</p>
          ) : (
            <p className="barra-noche" aria-label={`Noche ${vista.noche} de ${vista.nochesTotales}`}>
              <span className="lunas" aria-hidden>
                {Array.from({ length: vista.nochesTotales }, (_, i) => (
                  <span
                    key={i}
                    className={`luna ${i + 1 < vista.noche ? 'luna-pasada' : i + 1 === vista.noche ? 'luna-actual' : ''}`}
                  />
                ))}
              </span>
              noche {vista.noche} de {vista.nochesTotales}
            </p>
          )}
        </div>
        {vista.fase !== 'final' && vista.peligrosALaVista.length > 0 && (
          <div className="a-la-vista">
            <span className="a-la-vista-titulo">si vuelve a salir, se terminó</span>
            <span className="a-la-vista-iconos">
              {vista.peligrosALaVista.map((p) => (
                <span key={p.tipo} className="a-la-vista-icono" title={p.nombre}>
                  {p.icono}
                </span>
              ))}
            </span>
          </div>
        )}
        {codigo && (
          <p className="barra-sala">
            sala <strong>{codigo}</strong>
          </p>
        )}
      </header>

      {vista.fase === 'final' ? (
        <Final vista={vista} />
      ) : (
        <>
          <section className="zona-cartel">
            <Cartel vista={vista} segundos={segundos} />
          </section>

          <section className="camino">
            {vista.camino.map((c) => (
              <Carta key={c.id} carta={c} nueva={c.id === ultimaId} tesoro={vista.tablero.tesoro} />
            ))}
          </section>

          <section className="escena">
            <div className="campamento">
              <Fogata reloj={reloj} mostrarDigitos={false} />
              <EnElCampamento jugadores={vista.jugadores} fase={vista.fase} />
              <span className="rotulo">campamento</span>
            </div>
            <div className="sendero">
              <EnElCamino jugadores={vista.jugadores} fase={vista.fase} perro={vista.perro} />
              <span className="rotulo">en el camino</span>
              {vista.tirado > 0 && (
                <span className="tirado-chip" key={`t${vista.tirado}`}>
                  <strong>{vista.tirado}</strong> tirado{vista.tirado === 1 ? '' : 's'} · para el que vuelva
                </span>
              )}
            </div>
          </section>
        </>
      )}

      {vista.fase === 'emboscada' && <div className="destello" key={`d${vista.paso}`} />}
    </div>
  );
}
