/**
 * Proyecciones del estado autoritativo. Es lo único que sale del servidor.
 *
 * La ocultación de información se hace acá y solo acá. Si un cliente tuviera que
 * decidir qué no mostrar, alcanzaría con abrir el inspector para romper el juego.
 */

import type { JugadorId, ObjetoId, TramoId } from './ids.js';
import type { EntradaCronica, Fase, NivelRaciones, Vigor, EstadoPartida } from './estado.js';
import type { Rol } from './roles.js';
import { FICHAS } from './roles.js';
import { TIEMPOS, ventanaDecidirMs } from './config.js';
import { crearRng } from './rng.js';

/** Lo que se pinta en la TV. Todo esto es público por definición. */
export interface VistaTV {
  fase: Fase;
  noche: number;
  nochesTotales: number;
  /** 0..1 sobre la distancia total. La caravana se dibuja con esto. */
  progreso: number;
  /** 0..1 de la ventana de la fase. La llama se consume con esto. */
  reloj: number;
  /** La TV muestra dígitos solo en los últimos 30 segundos (D3). */
  mostrarDigitos: boolean;
  tablero: { id: string; nombre: string; paleta: Paleta; tramo: string };
  /** Sin números: barras cortas, siluetas, quién ya bloqueó. */
  viajeros: ViajeroPublico[];
  perro: { presente: boolean; alerta: string };
  /** Nombre y silueta nada más. El efecto no es público hasta que se usa. */
  objetos: { id: ObjetoId; nombre: string; portador?: JugadorId }[];
  candidatos: { id: TramoId; nombre: string; pista: string }[];
  ultimaCronica?: EntradaCronica;
  /** Disparadores de animación. La TV nunca decide sola cuándo animar (D4). */
  gatillos: Gatillo[];
}

export interface ViajeroPublico {
  id: JugadorId;
  nombre: string;
  rol: Rol;
  /** Cualitativo. La Curandera ve estados, no números que pueda dictar. */
  aspecto: 'entero' | 'cansado' | 'al_limite' | 'quebrado';
  bloqueo: 'pendiente' | 'listo';
  cargaObjeto: boolean;
}

export interface Paleta {
  cielo: string;
  cerroLejano: string;
  cerroMedio: string;
  cerroCercano: string;
  brasa: string;
}

export type Gatillo =
  | { tipo: 'ambiente' }
  | { tipo: 'resolucion'; duracionMs: number }
  | { tipo: 'alerta'; que: 'objeto' | 'quiebre' | 'perro'; duracionMs: number };

/**
 * Lo que ve un celular. Una sola cosa por pantalla, legible en 10 segundos (D1).
 *
 * `linea` es el tutorial encubierto (D8): en la noche 1 el celular no ofrece
 * opciones, dicta qué decir en voz alta.
 */
export interface VistaJugador {
  yo: { id: JugadorId; nombre: string; rol: Rol; llano: string };
  fase: Fase;
  noche: number;
  /** Texto para decir en voz alta. Si viene, va en lugar de las opciones. */
  linea?: string;
  /** Lo que este rol ve esta noche y nadie más. Vacío si está cegado. */
  revelacion?: Revelacion;
  /** Qué puede hacer ahora. Vacío = no le toca; la pantalla dice "hablá". */
  acciones: Accion[];
  /** Su boleta actual, si ya bloqueó. */
  boleta?: { ruta: TramoId; raciones: NivelRaciones; esfuerzo: JugadorId[] };
  /** Solo para el destinatario del trato, y solo esa noche (D9). */
  trato?: { texto: string; costo: string };
}

export type Revelacion =
  | { tipo: 'terreno'; tramo: TramoId; nombre: string; texto: string }
  | { tipo: 'gente'; filas: { jugador: JugadorId; nombre: string; estado: string }[] }
  | { tipo: 'inventario'; recurso: number; capacidad: number; nombreRecurso: string }
  | { tipo: 'registro'; texto: string; confiable: boolean }
  | { tipo: 'mando'; texto: string };

export type Accion =
  | { tipo: 'elegir_ruta'; opciones: { id: TramoId; nombre: string; pista: string }[] }
  | { tipo: 'elegir_raciones'; opciones: NivelRaciones[] }
  | { tipo: 'elegir_esfuerzo'; opciones: JugadorId[]; max: number }
  | { tipo: 'bloquear' }
  | { tipo: 'responder_trato' }
  | { tipo: 'entregar_objeto'; objeto: ObjetoId; candidatos: JugadorId[] }
  | { tipo: 'votar_tablero'; opciones: { id: string; nombre: string }[] };

/** El aspecto público sale del vigor. Un solo lugar para que TV y celular coincidan. */
export function aspectoDeVigor(vigor: Vigor): ViajeroPublico['aspecto'] {
  switch (vigor) {
    case 3:
      return 'entero';
    case 2:
      return 'cansado';
    case 1:
      return 'al_limite';
    case 0:
      return 'quebrado';
  }
}

const CONFIG_TABLEROS: Record<string, { nombre: string; paleta: Paleta }> = {
  'la-sierra': {
    nombre: 'La Sierra',
    paleta: {
      cielo: '#0b1020',
      cerroLejano: '#2a3450',
      cerroMedio: '#161d31',
      cerroCercano: '#080b14',
      brasa: '#ff7a3c',
    },
  },
  'el-salitral': {
    nombre: 'El Salitral',
    paleta: {
      cielo: '#080d1c',
      cerroLejano: '#3a3550',
      cerroMedio: '#1d1a2c',
      cerroCercano: '#0a0910',
      brasa: '#ffb05e',
    },
  },
};

function obtenerNombreObjeto(arquetipo: string): string {
  return arquetipo.replace(/-/g, ' ');
}

export function proyectarTV(estado: EstadoPartida, ahora = Date.now()): VistaTV {
  let reloj = 0;
  let mostrarDigitos = false;
  if (estado.nocheActual?.venceEn) {
    const restante = estado.nocheActual.venceEn - ahora;
    let duracion = 1;
    if (estado.fase === 'decidir') {
      duracion = ventanaDecidirMs(estado.noche);
      mostrarDigitos = restante > 0 && restante <= TIEMPOS.decidirDigitosMs;
    } else if (estado.fase === 'acampar') {
      duracion = TIEMPOS.acamparMs;
    } else if (estado.fase === 'resolver') {
      duracion = TIEMPOS.resolverMs;
    } else if (estado.fase === 'fogon') {
      duracion = TIEMPOS.fogonMs;
    } else if (estado.fase === 'reparto') {
      duracion = 15_000;
    }
    reloj = Math.max(0, Math.min(1, restante / duracion));
  }

  let tramoName = 'El inicio';
  if (estado.cronica.length > 0) {
    const ult = estado.cronica[estado.cronica.length - 1];
    const tramoFact = ult?.hechos.find((h) => h.startsWith('tramo:'));
    if (tramoFact) {
      tramoName = tramoFact.substring(6);
    }
  }

  const viajeros: ViajeroPublico[] = estado.viajeros.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    rol: j.rol,
    aspecto: aspectoDeVigor(j.vigor),
    bloqueo: estado.nocheActual?.boletas[j.id] ? 'listo' : 'pendiente',
    cargaObjeto: j.objeto !== undefined,
  }));

  const objetos = estado.objetos.map((o) => ({
    id: o.id,
    nombre: o.identificado ? obtenerNombreObjeto(o.arquetipo) : 'objeto misterioso',
    ...(o.portador ? { portador: o.portador } : {}),
  }));

  const candidatos =
    estado.nocheActual?.candidatos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      pista: c.pista,
    })) ?? [];

  const gatillos: Gatillo[] =
    estado.fase === 'resolver' ? [{ tipo: 'resolucion', duracionMs: TIEMPOS.resolverMs }] : [];

  return {
    fase: estado.fase,
    noche: estado.noche,
    nochesTotales: estado.nochesTotales,
    progreso: estado.distanciaTotal > 0 ? estado.avance / estado.distanciaTotal : 0,
    reloj,
    mostrarDigitos,
    tablero: {
      id: estado.tablero,
      nombre: CONFIG_TABLEROS[estado.tablero]?.nombre ?? estado.tablero,
      paleta: CONFIG_TABLEROS[estado.tablero]?.paleta ?? CONFIG_TABLEROS['la-sierra']!.paleta,
      tramo: tramoName,
    },
    viajeros,
    perro: {
      presente: estado.perro.presente,
      alerta: estado.perro.alerta,
    },
    objetos,
    candidatos,
    gatillos,
    ...(estado.cronica[estado.cronica.length - 1]
      ? { ultimaCronica: estado.cronica[estado.cronica.length - 1] }
      : {}),
  };
}

function curanderaEstado(vigor: Vigor): string {
  switch (vigor) {
    case 3:
      return 'está entero, no le duele nada';
    case 2:
      return 'se lo ve cansado, pero aguanta';
    case 1:
      return 'anda arrastrando la pierna';
    case 0:
      return 'está quebrado, no puede más';
  }
}

export function proyectarJugador(
  estado: EstadoPartida,
  jugadorId: JugadorId,
  ahora = Date.now(),
): VistaJugador {
  const yo = estado.viajeros.find((v) => v.id === jugadorId);
  if (!yo) {
    throw new Error(`Jugador ${jugadorId} no encontrado en la caravana`);
  }

  let revelacion: Revelacion | undefined;
  let acciones: Accion[] = [];
  let linea: string | undefined;

  const enLobby = estado.fase === 'lobby';
  const enAcampar = estado.fase === 'acampar';
  const enDecidir = estado.fase === 'decidir';
  const enFogon = estado.fase === 'fogon';

  // Revelaciones
  if (!yo.cegado && (enAcampar || enDecidir) && estado.nocheActual) {
    const infoFicha = FICHAS[yo.rol];
    if (estado.noche >= infoFicha.desbloqueo) {
      if (yo.rol === 'baqueano') {
        const tramo = estado.nocheActual.candidatos[0] as any;
        if (tramo) {
          revelacion = {
            tipo: 'terreno',
            tramo: tramo.id,
            nombre: tramo.nombre,
            texto: tramo.terreno,
          };
        }
      } else if (yo.rol === 'curandera') {
        revelacion = {
          tipo: 'gente',
          filas: estado.viajeros.map((v) => ({
            jugador: v.id,
            nombre: v.nombre,
            estado: curanderaEstado(v.vigor),
          })),
        };
      } else if (yo.rol === 'despensero') {
        const recursoNombre = estado.tablero === 'el-salitral' ? 'agua' : 'raciones';
        revelacion = {
          tipo: 'inventario',
          recurso: estado.recurso,
          capacidad: estado.capacidad,
          nombreRecurso: recursoNombre,
        };
      } else if (yo.rol === 'memorioso') {
        const localRng = crearRng(estado.semilla + '-memorioso-' + estado.noche);
        const tramo =
          estado.nocheActual.candidatos[1] || estado.nocheActual.candidatos[0];
        if (tramo) {
          const mentir = estado.tablero !== 'el-salitral' && localRng.suerte(0.2);
          if (mentir) {
            const falsaDureza = ((tramo.dureza + 1) % 4) as Vigor;
            const falsoCosto = tramo.costoRecurso === 0 ? 2 : -tramo.costoRecurso;
            revelacion = {
              tipo: 'registro',
              texto: `El registro dice que ${tramo.nombre} tiene dureza ${falsaDureza} y costo de recurso ${falsoCosto}.`,
              confiable: false,
            };
          } else {
            revelacion = {
              tipo: 'registro',
              texto: `El registro dice que ${tramo.nombre} tiene dureza ${tramo.dureza} y costo de recurso ${tramo.costoRecurso}.`,
              confiable: true,
            };
          }
        }
      } else if (yo.rol === 'capataz') {
        revelacion = {
          tipo: 'mando',
          texto: 'Sos el Capataz. Tenés el voto decisivo en caso de empate. En la noche 5 decidís vos solo.',
        };
      }
    }
  }

  // Tutorial Line
  if (estado.noche === 1 && enDecidir && estado.nocheActual) {
    if (yo.rol === 'baqueano') {
      const tramo = estado.nocheActual.candidatos[0];
      if (tramo) {
        linea = `Decí en voz alta: El camino de "${tramo.nombre}" es ${tramo.pista}.`;
      }
    } else {
      linea = 'Debatí en voz alta qué camino tomar según lo que dice el Baqueano.';
    }
  }

  // Acciones
  const boletaExistente = estado.nocheActual?.boletas[jugadorId];
  const otrosJugadores = estado.viajeros.filter((v) => v.id !== jugadorId);

  if (enDecidir && !boletaExistente && estado.nocheActual) {
    if (linea) {
      // Si tiene línea de tutorial, solo puede bloquear
      acciones = [{ tipo: 'bloquear' }];
    } else {
      acciones = [
        {
          tipo: 'elegir_ruta',
          opciones: estado.nocheActual.candidatos.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            pista: c.pista,
          })),
        },
        {
          tipo: 'elegir_raciones',
          opciones: ['ajustado', 'normal', 'abundante'],
        },
        {
          tipo: 'elegir_esfuerzo',
          opciones: estado.viajeros.filter((v) => v.vigor > 0).map((v) => v.id),
          max: 3,
        },
        { tipo: 'bloquear' },
      ];
    }

    if (estado.tratoOfrecidoA === jugadorId && !yo.aceptoElTrato) {
      acciones.push({ tipo: 'responder_trato' });
    }
  } else if (enAcampar) {
    if (yo.objeto) {
      acciones.push({
        tipo: 'entregar_objeto',
        objeto: yo.objeto,
        candidatos: otrosJugadores.map((v) => v.id),
      });
    }
    if (estado.tratoOfrecidoA === jugadorId && !yo.aceptoElTrato) {
      acciones.push({ tipo: 'responder_trato' });
    }
  } else if (enFogon) {
    if (yo.objeto) {
      acciones.push({
        tipo: 'entregar_objeto',
        objeto: yo.objeto,
        candidatos: otrosJugadores.map((v) => v.id),
      });
    }
  } else if (enLobby) {
    // Para cumplir con el test
    acciones = [
      {
        tipo: 'votar_tablero',
        opciones: [
          { id: 'la-sierra', nombre: 'La Sierra' },
          { id: 'el-salitral', nombre: 'El Salitral' },
        ],
      },
    ];
  }

  let trato: { texto: string; costo: string } | undefined;
  if (estado.tratoOfrecidoA === jugadorId && (enAcampar || enDecidir) && !yo.aceptoElTrato) {
    trato = {
      texto: 'El camino te ofrece asegurar tu objetivo personal secreto a cambio de un precio grupal.',
      costo: 'Costo grupal diferido en la noche 5.',
    };
  }

  return {
    yo: {
      id: yo.id,
      nombre: yo.nombre,
      rol: yo.rol,
      llano: FICHAS[yo.rol].llano,
    },
    fase: estado.fase,
    noche: estado.noche,
    ...(linea ? { linea } : {}),
    ...(revelacion ? { revelacion } : {}),
    acciones,
    ...(boletaExistente ? { boleta: boletaExistente } : {}),
    ...(trato ? { trato } : {}),
  };
}

