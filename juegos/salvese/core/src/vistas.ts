/**
 * Proyecciones del estado autoritativo. Es lo único que sale del servidor.
 *
 * La ocultación de información se hace acá y solo acá. Si un cliente tuviera que
 * decidir qué no mostrar, alcanzaría con abrir el inspector para romper el juego.
 */

import type { JugadorId, ObjetoId, TramoId } from './ids.js';
import type { EntradaCronica, Fase, NivelRaciones, Vigor, EstadoPartida, RevelacionBoletas, Viajero } from './estado.js';
import type { Rol } from './roles.js';
import { FICHAS } from './roles.js';
import { TIEMPOS, ventanaDecidirMs, AVANCE, hayRepartoDeEsfuerzo } from './config.js';
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
  tablero: { id: string; nombre: string; paleta: Paleta; tramo: string; fondo: string };
  /** Sin números: barras cortas, siluetas, quién ya bloqueó. */
  viajeros: ViajeroPublico[];
  perro: {
    presente: boolean;
    alerta: string;
    /** El Capataz lo mandó a explorar esta noche y todavía no se supo el resultado (A2). */
    explorando?: boolean;
    /** Si volvió de explorar anoche: el tramo más duro de esta noche, dato público (A2, D10). */
    tramoRevelado?: string;
  };
  /** Nombre y silueta nada más. El efecto no es público hasta que se usa. */
  objetos: { id: ObjetoId; nombre: string; portador?: JugadorId }[];
  candidatos: { id: TramoId; nombre: string; pista: string }[];
  ultimaCronica?: EntradaCronica;
  /** Disparadores de animación. La TV nunca decide sola cuándo animar (D4). */
  gatillos: Gatillo[];
  /** Se llena recién en `epilogo`. La revelación reinterpreta la partida entera. */
  desenlace?: DesenlacePublico;
  /**
   * Quién votó qué la última noche resuelta, y cómo se resolvió (D18).
   * CRÍTICO: solo va en la vista si `fase` es `fogon` o `epilogo`. Es
   * información secreta durante `decidir` — si se filtrara antes, cualquiera
   * podría leer la TV y el juego de información oculta se termina. Ver
   * `proyectarTV()`.
   */
  revelacion?: RevelacionBoletas;
}

export interface DesenlacePublico {
  llegaron: boolean;
  perroLlego: boolean;
  /** Un objetivo por viajero, ya resuelto a texto legible y a si se cumplió. */
  objetivos: { jugador: JugadorId; nombre: string; texto: string; cumplido: boolean }[];
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
  yo: { id: JugadorId; nombre: string; rol: Rol; llano: string; objetivo: string };
  fase: Fase;
  noche: number;
  /** Texto para decir en voz alta. Si viene, va en lugar de las opciones. */
  linea?: string;
  /** Lo que este rol ve esta noche y nadie más. Vacío si está cegado. */
  revelacion?: Revelacion;
  /** Qué puede hacer ahora. Vacío = no le toca; la pantalla dice "hablá". */
  acciones: Accion[];
  /** Su boleta actual, si ya bloqueó. */
  boleta?: { ruta: TramoId; raciones: NivelRaciones };
  /** Solo para el destinatario del trato, y solo esa noche (D9). */
  trato?: { texto: string; costo: string };
  /**
   * Si el perro volvió de explorar anoche (A2): el tramo más duro de esta
   * noche. Dato público, igual que en la TV — no es un secreto de rol.
   */
  perroTramoRevelado?: string;
  /**
   * El pago del jugador, recién en `epilogo` (A3). Antes de esto, el celular
   * repetía "no te toca ninguna acción" el epílogo entero: la persona que más
   * le prestó atención a su rol era la que menos se enteraba de cómo terminó.
   * Solo trae SU objetivo — el de los demás es de la TV (`VistaTV.desenlace`).
   */
  miDesenlace?: { objetivo: string; cumplido: boolean; llegaron: boolean };
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
  /**
   * A quiénes manda al trabajo pesado esta noche (D19). Del Capataz si hay uno
   * en la mesa (`modo: 'capataz'`); si no, cada uno recibe la suya propia con
   * una sola opción —él mismo— (`modo: 'voluntario'`). Independiente de la
   * boleta: se puede mandar antes, después o sin haber bloqueado ruta ni
   * raciones.
   *
   * `opciones` trae nombres, no solo ids (D4, vista autocontenida), y a los
   * que no se pueden elegir los trae igual con `disponible: false` y un
   * `motivo` legible: el celular los muestra deshabilitados, no los esconde,
   * porque que se vea por qué no se puede es parte de la conversación.
   *
   * `yaReparti` y `yaAsignado` son lo que hace que esto sobreviva a recargar
   * el celular: sin ellos el cliente tiene que recordar en estado local que ya
   * respondió, se pierde al recargar y vuelve a pedir el reparto (D4 — el
   * estado vive en el servidor, el cliente solo pinta).
   */
  | {
      tipo: 'repartir_esfuerzo';
      modo: 'capataz' | 'voluntario';
      opciones: { id: JugadorId; nombre: string; disponible: boolean; motivo?: string }[];
      max: number;
      /** Si este jugador ya mandó su reparto esta noche. Puede cambiarlo igual. */
      yaReparti: boolean;
      /**
       * Lo ya asignado que este jugador puede ver: la lista entera si es el
       * Capataz (es su propia decisión), y solo si está él mismo en modo
       * voluntario — que otro se haya ofrecido es secreto hasta el fogón (I7).
       */
      yaAsignado: JugadorId[];
    }
  | { tipo: 'bloquear' }
  /**
   * Mandar al perro a explorar (A2, D10). Solo se le ofrece al Capataz, desde
   * la noche 3 y solo si `perro.presente`. Independiente de la boleta y del
   * esfuerzo, con su propia pantalla — es una decisión que se dice en voz
   * alta y que se puede perder.
   *
   * `yaMandado` es lo que hace que sobreviva a recargar el celular (D4): no
   * se puede mandar dos veces la misma noche, y sin este dato el cliente
   * tendría que recordarlo en estado local.
   */
  /**
   * El Capataz decide qué hace con el perro esta noche (D10, A2).
   *
   * `yaDecidio` es lo que apaga la pantalla en el celular, no `yaMandado`:
   * "que se quede" también es una respuesta y tiene que sobrevivir a recargar
   * el teléfono. Mismo criterio que `repartir_esfuerzo.yaReparti` — el estado
   * vive en el servidor (D4).
   */
  | { tipo: 'mandar_perro'; yaMandado: boolean; yaDecidio: boolean }
  | { tipo: 'responder_trato' }
  | { tipo: 'entregar_objeto'; objeto: ObjetoId; candidatos: { id: JugadorId; nombre: string }[] }
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

const CONFIG_TABLEROS: Record<string, { nombre: string; paleta: Paleta; fondos: string[] }> = {
  'la-sierra': {
    nombre: 'La Sierra',
    paleta: {
      cielo: '#0b1020',
      cerroLejano: '#2a3450',
      cerroMedio: '#161d31',
      cerroCercano: '#080b14',
      brasa: '#ff7a3c',
    },
    fondos: ['fogata-cerro', 'fogata-vado', 'filo-noche', 'bosque-bajo', 'amanecer-sierra'],
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
    fondos: ['salitral-luna', 'medano-noche', 'aguada', 'monte-bajo', 'amanecer-sal'],
  },
};

/**
 * Texto legible de cada objetivo, por tablero. Duplica lo que ya está en
 * `@salvese/tableros` (mismo patrón que `CONFIG_TABLEROS` arriba): esta
 * proyección no depende del paquete de tableros, así que se queda con su
 * propia copia liviana en vez de importar el catálogo entero.
 */
const OBJETIVOS_TEXTO: Record<string, Record<string, string>> = {
  'la-sierra': {
    'llegar-entero': 'Llegar sin haberte quebrado nunca.',
    'que-nadie-quede': 'Que ningún viajero termine quebrado.',
    'sobre-raciones': 'Que sobren raciones al llegar.',
    'el-perro-llega': 'Que el perro llegue.',
    'mano-propia': 'Haber hecho el trabajo pesado más noches que cualquier otro.',
    'nunca-el-atajo': 'Que la caravana no haya tomado nunca el atajo.',
    'ver-el-final': 'Llegar. Nada más que eso.',
  },
  'el-salitral': {
    'agua-de-sobra': 'Llegar con agua de sobra.',
    'nunca-la-aguada': 'Que no haya hecho falta desviarse nunca.',
    'que-nadie-quede': 'Que ningún viajero termine quebrado.',
    'el-perro-llega': 'Que el perro llegue.',
    'cruzar-la-sal': 'Haber cruzado la lengua de sal.',
    'sin-carga': 'Llegar sin cargar nada.',
  },
};

function obtenerNombreObjeto(arquetipo: string): string {
  return arquetipo.replace(/-/g, ' ');
}

export function proyectarTV(
  estado: EstadoPartida,
  ahora = Date.now(),
  /**
   * Gatillos de ESTA publicación, no del estado. Los pone el llamador a partir
   * de `Efecto.publicar.gatillos` (ver maquina.ts): nacen en la transición que
   * los dispara y no se recalculan acá. Una republicación que no viene de esa
   * transición —reconexión, heartbeat— no trae ninguno, y la TV no anima nada.
   */
  gatillosExtra: Gatillo[] = [],
): VistaTV {
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

  // Un fondo por noche, determinista: misma noche siempre pinta el mismo
  // fondo, sin importar cuántas veces se reproyecte (D4). No hay generación
  // en vivo (07-capa-llm.md): esto elige de la librería estática del tablero.
  const fondosDelTablero = CONFIG_TABLEROS[estado.tablero]?.fondos ?? CONFIG_TABLEROS['la-sierra']!.fondos;
  const indiceFondo = Math.max(0, estado.noche - 1) % fondosDelTablero.length;
  const fondo = fondosDelTablero[indiceFondo]!;

  const desenlace: DesenlacePublico | undefined = estado.desenlace
    ? {
        llegaron: estado.desenlace.llegaron,
        perroLlego: estado.desenlace.perroLlego,
        objetivos: estado.viajeros.map((v) => ({
          jugador: v.id,
          nombre: v.nombre,
          texto: OBJETIVOS_TEXTO[estado.tablero]?.[v.objetivo] ?? 'Un objetivo personal.',
          cumplido: estado.desenlace!.objetivosCumplidos.includes(v.id),
        })),
      }
    : undefined;

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
      fondo,
    },
    viajeros,
    perro: {
      presente: estado.perro.presente,
      alerta: estado.perro.alerta,
      // Dato nada más (A2): que se lo mandó a explorar es público —se dice en
      // voz alta— y dura hasta que resuelve la noche. No hay pintura acá.
      ...(estado.nocheActual?.perroExplorando ? { explorando: true } : {}),
      ...(estado.perro.tramoRevelado ? { tramoRevelado: estado.perro.tramoRevelado } : {}),
    },
    objetos,
    candidatos,
    gatillos: gatillosExtra,
    ...(estado.cronica[estado.cronica.length - 1]
      ? { ultimaCronica: estado.cronica[estado.cronica.length - 1] }
      : {}),
    ...(desenlace ? { desenlace } : {}),
    // CRÍTICO: solo en `fogon` o `epilogo`. Las boletas son secretas mientras
    // se decide (D18) — si esto saliera en `decidir`, cualquiera podría leer
    // en la TV quién votó qué antes de que termine la ventana de discusión.
    ...(estado.ultimaRevelacion && (estado.fase === 'fogon' || estado.fase === 'epilogo')
      ? { revelacion: estado.ultimaRevelacion }
      : {}),
  };
}

/**
 * Una opción del celu para `repartir_esfuerzo`. Los que no se pueden elegir
 * van igual, deshabilitados con un motivo legible: que se vea por qué no se
 * puede es parte de la conversación (D19), no algo para esconder.
 */
function opcionEsfuerzo(
  v: Viajero,
  esfuerzoNocheAnterior: JugadorId[],
): { id: JugadorId; nombre: string; disponible: boolean; motivo?: string } {
  if (v.vigor === 0) {
    return { id: v.id, nombre: v.nombre, disponible: false, motivo: 'está quebrado' };
  }
  if (esfuerzoNocheAnterior.includes(v.id)) {
    return { id: v.id, nombre: v.nombre, disponible: false, motivo: 'fue anoche' };
  }
  return { id: v.id, nombre: v.nombre, disponible: true };
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
          texto:
            'Sos el Capataz. Repartís quién va al trabajo pesado todas las noches, ' +
            'tenés el voto decisivo en caso de empate y en la noche 5 decidís vos solo.',
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

  if (enDecidir && estado.nocheActual) {
    if (!boletaExistente) {
      if (linea) {
        // Si tiene línea de tutorial, solo puede bloquear (D8: una sola
        // decisión en la noche 1, nada de repartir esfuerzo tampoco).
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
          { tipo: 'bloquear' },
        ];
      }

      if (estado.tratoOfrecidoA === jugadorId && !yo.aceptoElTrato) {
        acciones.push({ tipo: 'responder_trato' });
      }
    }

    // El reparto del esfuerzo es independiente de la boleta (D19): se ofrece
    // aunque ya se haya bloqueado ruta y raciones. En la noche 1 no se reparte
    // (D8, una sola decisión) y esa condición sale del mismo helper que usa el
    // motor para decidir si el atajo de "todos bloquearon" espera al Capataz:
    // si las dos no coinciden, la noche 1 no resuelve nunca por atajo.
    if (hayRepartoDeEsfuerzo(estado.noche)) {
      const respondieron = estado.nocheActual.esfuerzoRespondieron ?? [];
      const asignados = estado.nocheActual.esfuerzoAsignado ?? [];
      const capatazEnMesa = estado.viajeros.find((v) => v.rol === 'capataz');
      if (capatazEnMesa) {
        if (yo.rol === 'capataz') {
          acciones.push({
            tipo: 'repartir_esfuerzo',
            modo: 'capataz',
            opciones: estado.viajeros.map((v) => opcionEsfuerzo(v, estado.esfuerzoNocheAnterior)),
            max: AVANCE.esfuerzoMax,
            yaReparti: respondieron.includes(yo.id),
            yaAsignado: asignados,
          });
        }
      } else {
        // Sin Capataz en la mesa, cada uno se ofrece solo a sí mismo (D19).
        // `yaAsignado` se filtra a uno mismo: que otro se haya ofrecido es
        // secreto hasta el fogón, igual que la boleta (I7).
        acciones.push({
          tipo: 'repartir_esfuerzo',
          modo: 'voluntario',
          opciones: [opcionEsfuerzo(yo, estado.esfuerzoNocheAnterior)],
          max: 1,
          yaReparti: respondieron.includes(yo.id),
          yaAsignado: asignados.filter((id) => id === yo.id),
        });
      }
    }

    // Mandar al perro a explorar (A2, D10): solo el Capataz, desde la noche
    // 3 y solo si sigue presente. Independiente de la boleta y del esfuerzo,
    // como `repartir_esfuerzo` arriba.
    if (yo.rol === 'capataz' && estado.noche >= 3 && estado.perro.presente) {
      acciones.push({
        tipo: 'mandar_perro',
        yaMandado: estado.nocheActual.perroExplorando === true,
        yaDecidio: estado.nocheActual.perroDecidido === true,
      });
    }
  } else if (enAcampar) {
    if (yo.objeto) {
      acciones.push({
        tipo: 'entregar_objeto',
        objeto: yo.objeto,
        candidatos: otrosJugadores.map((v) => ({ id: v.id, nombre: v.nombre })),
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
        candidatos: otrosJugadores.map((v) => ({ id: v.id, nombre: v.nombre })),
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

  // El pago del jugador, recién en `epilogo` (A3). Solo el suyo: el de los
  // demás sale de `VistaTV.desenlace`, no de acá — filtrarlo es la regla, no
  // un detalle (05-vistas-por-rol.md § Reglas de proyección).
  let miDesenlace: VistaJugador['miDesenlace'];
  if (estado.fase === 'epilogo' && estado.desenlace) {
    miDesenlace = {
      objetivo: OBJETIVOS_TEXTO[estado.tablero]?.[yo.objetivo] ?? 'Un objetivo personal.',
      cumplido: estado.desenlace.objetivosCumplidos.includes(yo.id),
      llegaron: estado.desenlace.llegaron,
    };
  }

  return {
    yo: {
      id: yo.id,
      nombre: yo.nombre,
      rol: yo.rol,
      llano: FICHAS[yo.rol].llano,
      objetivo: OBJETIVOS_TEXTO[estado.tablero]?.[yo.objetivo] ?? 'Un objetivo personal.',
    },
    fase: estado.fase,
    noche: estado.noche,
    ...(linea ? { linea } : {}),
    ...(revelacion ? { revelacion } : {}),
    acciones,
    ...(boletaExistente ? { boleta: boletaExistente } : {}),
    ...(trato ? { trato } : {}),
    ...(estado.perro.tramoRevelado ? { perroTramoRevelado: estado.perro.tramoRevelado } : {}),
    ...(miDesenlace ? { miDesenlace } : {}),
  };
}

