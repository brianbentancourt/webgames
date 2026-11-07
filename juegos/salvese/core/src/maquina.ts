/**
 * La máquina de reglas. Pura y determinista: (estado, comando) → (estado, efectos).
 *
 * No sabe de sockets ni de relojes. Cuando una fase dura, devuelve un efecto
 * `agendar` y el servidor le avisa con `vencio_fase` cuando se cumple el plazo.
 * Nunca lanza: lo inválido vuelve como `Rechazo`.
 *
 * El loop de una noche:
 *
 *   presentacion → revelar ─┬─ hallazgo / primer peligro → decidir → retirada ─┐
 *                    ▲      └─ segundo peligro igual → emboscada → fin_noche   │
 *                    └──────────── queda alguien en el camino ─────────────────┤
 *                                  no queda nadie → fin_noche ←────────────────┘
 */

import { PERRO, TIEMPOS } from './config.js';
import type {
  AvisoPerro,
  Carta,
  Eleccion,
  EstadoPartida,
  Estadisticas,
  FinDeNoche,
  Jugador,
  TableroDato,
} from './estado.js';
import type { JugadorId } from './ids.js';
import { crearRng } from './rng.js';

/* ------------------------------------------------------------------ */
/* Contrato                                                            */
/* ------------------------------------------------------------------ */

export type Comando =
  | {
      t: 'empezar';
      tablero: TableroDato;
      semilla: string;
      jugadores: { id: JugadorId; nombre: string }[];
    }
  | { t: 'vencio_fase' }
  | { t: 'elegir'; jugador: JugadorId; opcion: Eleccion }
  /**
   * Desde el final: otra partida con el mismo tablero. Sin `jugadores`, la
   * misma mesa; con `jugadores`, la mesa nueva (los que llegaron tarde entran acá).
   */
  | { t: 'revancha'; jugador: JugadorId; jugadores?: { id: JugadorId; nombre: string }[] };

export type Efecto =
  /** Avisame con `vencio_fase` dentro de `enMs`. Reemplaza cualquier aviso anterior. */
  | { t: 'agendar'; enMs: number }
  /** Mandá las vistas nuevas a todos. */
  | { t: 'publicar' };

export type MotivoRechazo =
  | 'fuera_de_fase'
  | 'jugador_desconocido'
  | 'no_esta_en_el_camino'
  | 'ya_eligio'
  | 'pocos_jugadores'
  | 'sin_partida';

export type Resultado =
  | { ok: true; estado: EstadoPartida; efectos: Efecto[] }
  | { ok: false; motivo: MotivoRechazo };

const rechazo = (motivo: MotivoRechazo): Resultado => ({ ok: false, motivo });

const listo = (estado: EstadoPartida, enMs?: number): Resultado => ({
  ok: true,
  estado: { ...estado, paso: estado.paso + 1 },
  efectos: enMs === undefined ? [{ t: 'publicar' }] : [{ t: 'agendar', enMs }, { t: 'publicar' }],
});

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export function reducir(estado: EstadoPartida | null, comando: Comando): Resultado {
  if (comando.t === 'empezar') {
    if (comando.jugadores.length < 2) return rechazo('pocos_jugadores');
    return empezarNoche(partidaNueva(comando.tablero, comando.semilla, comando.jugadores, 0), 1);
  }
  if (estado === null) return rechazo('sin_partida');

  switch (comando.t) {
    case 'vencio_fase':
      return vencer(estado);
    case 'elegir':
      return elegir(estado, comando.jugador, comando.opcion);
    case 'revancha': {
      if (estado.fase !== 'final') return rechazo('fuera_de_fase');
      if (!estado.jugadores.some((j) => j.id === comando.jugador)) return rechazo('jugador_desconocido');
      const mesa = comando.jugadores ?? estado.jugadores.map((j) => ({ id: j.id, nombre: j.nombre }));
      if (mesa.length < 2) return rechazo('pocos_jugadores');
      const nueva = partidaNueva(estado.tablero, estado.semilla, mesa, estado.ronda + 1);
      return empezarNoche({ ...nueva, paso: estado.paso }, 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Armado                                                              */
/* ------------------------------------------------------------------ */

const statsVacias = (): Estadisticas => ({
  vecesAtrapado: 0,
  perdidoMax: 0,
  perdidoTotal: 0,
  volvioSolo: 0,
  primeroEnVolver: 0,
  ultimoEnVolver: 0,
});

function partidaNueva(
  tablero: TableroDato,
  semilla: string,
  jugadores: { id: JugadorId; nombre: string }[],
  ronda: number,
): EstadoPartida {
  return {
    tablero,
    semilla,
    ronda,
    noche: 0,
    fase: 'presentacion',
    paso: 0,
    jugadores: jugadores.map(
      (j): Jugador => ({
        id: j.id,
        nombre: j.nombre,
        baul: 0,
        mochila: 0,
        lugar: 'camino',
        eleccion: null,
        ganadoNoche: 0,
        perdidoNoche: 0,
        stats: statsVacias(),
      }),
    ),
    mazo: [],
    camino: [],
    quitados: {},
    perro: null,
    retirada: null,
    emboscada: null,
    historial: [],
  };
}

/** Todos los hallazgos más las copias de peligro que siguen en juego, barajados. */
export function armarMazo(estado: EstadoPartida, noche: number): Carta[] {
  const { tablero } = estado;
  const cartas: Carta[] = tablero.hallazgos.map((h, i) => ({
    id: `h${i}`,
    t: 'hallazgo',
    valor: h.valor,
    nombre: h.nombre,
  }));
  for (const p of tablero.peligros) {
    const copias = tablero.copiasPorPeligro - (estado.quitados[p.tipo] ?? 0);
    for (let k = 0; k < copias; k++) cartas.push({ id: `${p.tipo}-${k}`, t: 'peligro', tipo: p.tipo });
  }
  return crearRng(`${estado.semilla}:${estado.ronda}:mazo:${noche}`).barajar(cartas);
}

function empezarNoche(estado: EstadoPartida, noche: number): Resultado {
  return listo(
    {
      ...estado,
      noche,
      fase: 'presentacion',
      mazo: armarMazo(estado, noche),
      camino: [],
      perro: null,
      retirada: null,
      emboscada: null,
      jugadores: estado.jugadores.map((j) => ({
        ...j,
        mochila: 0,
        lugar: 'camino',
        eleccion: null,
        ganadoNoche: 0,
        perdidoNoche: 0,
      })),
    },
    TIEMPOS.presentacionMs,
  );
}

/* ------------------------------------------------------------------ */
/* Reloj                                                               */
/* ------------------------------------------------------------------ */

function vencer(estado: EstadoPartida): Resultado {
  switch (estado.fase) {
    case 'presentacion':
      return revelar(estado);
    case 'revelar':
      return abrirDecision(estado);
    case 'decidir':
      return cerrarDecision(estado);
    case 'retirada':
      return enCamino(estado).length === 0 ? terminarNoche(estado, 'todos_volvieron') : revelar(estado);
    case 'emboscada':
      return terminarNoche(estado, 'emboscada');
    case 'fin_noche':
      return estado.noche < estado.tablero.noches
        ? empezarNoche(estado, estado.noche + 1)
        : listo({ ...estado, fase: 'final' });
    case 'final':
      return rechazo('fuera_de_fase');
  }
}

const enCamino = (estado: EstadoPartida) => estado.jugadores.filter((j) => j.lugar === 'camino');

/* ------------------------------------------------------------------ */
/* Dar vuelta un tramo                                                 */
/* ------------------------------------------------------------------ */

function revelar(estado: EstadoPartida): Resultado {
  const [carta, ...mazo] = estado.mazo;
  // Con 15 hallazgos y a lo sumo dos peligros por tipo antes de la emboscada,
  // quedarse sin cartas es casi imposible. Si pasa, los que siguen vuelven
  // enteros: el camino se terminó antes que ellos.
  if (carta === undefined) return terminarNoche(bancarATodos(estado), 'sin_cartas');

  const presentes = enCamino(estado);

  if (carta.t === 'hallazgo') {
    const cadaUno = Math.floor(carta.valor / presentes.length);
    const resto = carta.valor % presentes.length;
    return listo(
      {
        ...estado,
        fase: 'revelar',
        mazo,
        perro: null,
        retirada: null,
        camino: [...estado.camino, { carta, resto }],
        jugadores: estado.jugadores.map((j) =>
          j.lugar === 'camino' ? { ...j, mochila: j.mochila + cadaUno } : j,
        ),
      },
      TIEMPOS.hallazgoMs,
    );
  }

  const repetido = estado.camino.some((c) => c.carta.t === 'peligro' && c.carta.tipo === carta.tipo);
  const camino = [...estado.camino, { carta, resto: 0 }];

  if (!repetido) {
    return listo({ ...estado, fase: 'revelar', mazo, camino, perro: null, retirada: null }, TIEMPOS.sustoMs);
  }

  // Emboscada: los que siguen en el camino pierden lo que cargan, y una copia
  // de ese peligro sale del juego (lo que ya pasó no vuelve a pasar igual).
  const perdieron = presentes.map((j) => ({ jugador: j.id, cuanto: j.mochila }));
  return listo(
    {
      ...estado,
      fase: 'emboscada',
      mazo,
      camino,
      perro: null,
      retirada: null,
      emboscada: { tipo: carta.tipo, perdieron },
      quitados: { ...estado.quitados, [carta.tipo]: (estado.quitados[carta.tipo] ?? 0) + 1 },
      jugadores: estado.jugadores.map((j) => {
        if (j.lugar !== 'camino') return j;
        return {
          ...j,
          lugar: 'atrapado',
          perdidoNoche: j.mochila,
          mochila: 0,
          stats: {
            ...j.stats,
            vecesAtrapado: j.stats.vecesAtrapado + 1,
            perdidoTotal: j.stats.perdidoTotal + j.mochila,
            perdidoMax: Math.max(j.stats.perdidoMax, j.mochila),
          },
        };
      }),
    },
    TIEMPOS.emboscadaMs,
  );
}

function bancarATodos(estado: EstadoPartida): EstadoPartida {
  return {
    ...estado,
    jugadores: estado.jugadores.map((j) =>
      j.lugar === 'camino'
        ? { ...j, baul: j.baul + j.mochila, ganadoNoche: j.ganadoNoche + j.mochila, mochila: 0, lugar: 'campamento' }
        : j,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Sigo o me vuelvo                                                    */
/* ------------------------------------------------------------------ */

function abrirDecision(estado: EstadoPartida): Resultado {
  return listo(
    {
      ...estado,
      fase: 'decidir',
      perro: olfatear(estado),
      jugadores: estado.jugadores.map((j) => (j.lugar === 'camino' ? { ...j, eleccion: null } : j)),
    },
    TIEMPOS.decidirMs,
  );
}

/** Qué cara pone el perro según lo que viene. Público, y a veces equivocado. */
export function olfatear(estado: EstadoPartida): AvisoPerro {
  const proxima = estado.mazo[0];
  if (proxima === undefined) return 'tranquilo';
  const letal =
    proxima.t === 'peligro' &&
    estado.camino.some((c) => c.carta.t === 'peligro' && c.carta.tipo === proxima.tipo);
  const tabla = letal ? PERRO.letal : proxima.t === 'peligro' ? PERRO.peligro : PERRO.hallazgo;
  const r = crearRng(`${estado.semilla}:${estado.ronda}:perro:${estado.noche}:${estado.camino.length}`).siguiente();
  if (r < tabla.tranquilo) return 'tranquilo';
  if (r < tabla.tranquilo + tabla.inquieto) return 'inquieto';
  return 'grune';
}

function elegir(estado: EstadoPartida, id: JugadorId, opcion: Eleccion): Resultado {
  if (estado.fase !== 'decidir') return rechazo('fuera_de_fase');
  const jugador = estado.jugadores.find((j) => j.id === id);
  if (jugador === undefined) return rechazo('jugador_desconocido');
  if (jugador.lugar !== 'camino') return rechazo('no_esta_en_el_camino');
  // Un toque y queda. Cambiar de idea después de ver la cara del de al lado
  // sería otro juego.
  if (jugador.eleccion !== null) return rechazo('ya_eligio');

  const siguiente: EstadoPartida = {
    ...estado,
    jugadores: estado.jugadores.map((j) => (j.id === id ? { ...j, eleccion: opcion } : j)),
  };
  // Si ya eligieron todos, no hay por qué esperar al reloj.
  if (enCamino(siguiente).every((j) => j.eleccion !== null)) return cerrarDecision(siguiente);
  // Sin `agendar`: el reloj que ya corre sigue siendo el que manda. Y sin
  // subir `paso`: no es una fase nueva, y los celulares que todavía no
  // eligieron no tienen que volver a vibrar porque eligió otro.
  return { ok: true, estado: siguiente, efectos: [{ t: 'publicar' }] };
}

function cerrarDecision(estado: EstadoPartida): Resultado {
  const presentes = enCamino(estado);
  const callados = presentes.filter((j) => j.eleccion === null).map((j) => j.id);
  const volvieron = presentes.filter((j) => j.eleccion === 'vuelvo').map((j) => j.id);
  const siguieron = presentes.filter((j) => j.eleccion !== 'vuelvo').map((j) => j.id);

  const tirado = estado.camino.reduce((s, c) => s + c.resto, 0);
  const cadaUno = volvieron.length > 0 ? Math.floor(tirado / volvieron.length) : 0;
  const sobra = volvieron.length > 0 ? tirado % volvieron.length : tirado;

  // Lo que no se pudo repartir entre los que volvieron se queda en el camino.
  // Se junta en el último tramo con resto para que la TV lo siga mostrando.
  let camino = estado.camino;
  if (volvieron.length > 0) {
    camino = estado.camino.map((c) => ({ ...c, resto: 0 }));
    if (sobra > 0) {
      const i = camino.map((c) => c.carta.t).lastIndexOf('hallazgo');
      if (i >= 0) camino[i] = { ...camino[i]!, resto: sobra };
    }
  }

  const nadieHabiaVuelto = estado.jugadores.every((j) => j.lugar !== 'campamento');
  const vaciaElCamino = volvieron.length > 0 && siguieron.length === 0;
  const solo = volvieron.length === 1;

  return listo(
    {
      ...estado,
      fase: 'retirada',
      perro: null,
      camino,
      retirada: { volvieron, siguieron, callados, cadaUno },
      jugadores: estado.jugadores.map((j) => {
        if (j.lugar !== 'camino') return j;
        if (!volvieron.includes(j.id)) return { ...j, eleccion: j.eleccion ?? 'sigo' };
        const lleva = j.mochila + cadaUno;
        return {
          ...j,
          lugar: 'campamento',
          baul: j.baul + lleva,
          ganadoNoche: j.ganadoNoche + lleva,
          mochila: 0,
          stats: {
            ...j.stats,
            volvioSolo: j.stats.volvioSolo + (solo && cadaUno > 0 ? 1 : 0),
            primeroEnVolver: j.stats.primeroEnVolver + (nadieHabiaVuelto ? 1 : 0),
            ultimoEnVolver: j.stats.ultimoEnVolver + (vaciaElCamino ? 1 : 0),
          },
        };
      }),
    },
    TIEMPOS.retiradaMs,
  );
}

/* ------------------------------------------------------------------ */
/* Cierre                                                              */
/* ------------------------------------------------------------------ */

function terminarNoche(estado: EstadoPartida, motivo: FinDeNoche): Resultado {
  const tipo = motivo === 'emboscada' ? estado.emboscada?.tipo : undefined;
  return listo(
    {
      ...estado,
      fase: 'fin_noche',
      perro: null,
      historial: [
        ...estado.historial,
        {
          noche: estado.noche,
          motivo,
          ...(tipo !== undefined ? { tipo } : {}),
          tramos: estado.camino.length,
          filas: estado.jugadores.map((j) => ({ jugador: j.id, ganado: j.ganadoNoche, perdido: j.perdidoNoche })),
        },
      ],
    },
    TIEMPOS.finNocheMs,
  );
}
