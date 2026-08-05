/**
 * El estado autoritativo de una partida. Vive en el servidor y nada más (D4).
 *
 * Los clientes nunca reciben este objeto: reciben vistas derivadas (ver vistas.ts).
 * Si un campo de acá llegara al celular, el juego de información oculta se termina.
 */

import type { JugadorId, ObjetivoId, ObjetoId, PartidaId, TableroId, TramoId } from './ids.js';
import type { Rol } from './roles.js';

export const FASES = ['lobby', 'reparto', 'acampar', 'decidir', 'resolver', 'fogon', 'epilogo'] as const;
export type Fase = (typeof FASES)[number];

export type Vigor = 0 | 1 | 2 | 3;

export interface Viajero {
  readonly id: JugadorId;
  nombre: string;
  rol: Rol;
  /** Asiento en el reparto. Dos asientos con el mismo rol son una pareja (6–10 jugadores). */
  asiento: number;
  /** El otro asiento del mismo rol, si lo hay. Acuerdan entre sí antes de hablarle al grupo. */
  parejaDe?: JugadorId;
  vigor: Vigor;
  /** Secreto. Se revela recién en el epílogo y reinterpreta la partida entera. */
  objetivo: ObjetivoId;
  /** Objeto que carga. Uno solo: los objetos se reparten, no se recogen (D11). */
  objeto?: ObjetoId;
  /** Un jugador desconectado sigue en la caravana; su boleta la completa el motor. */
  conectado: boolean;
  /** La habilidad de este rol está ciega esta noche (noches 3–4). */
  cegado: boolean;
  /** Aceptó el trato. Nunca lo hace perder: cambia el final y la crónica (D9). */
  aceptoElTrato: boolean;
  /** Solo se usa en `lobby`, antes de que el motor asigne roles con `empezar`. */
  listo?: boolean;
}

export interface EstadoPerro {
  presente: boolean;
  /** Lo único público del juego. Todos lo ven y cada uno lo interpreta distinto. */
  alerta: 'ninguna' | 'inquieto' | 'grune' | 'no_avanza';
  /** Secreto: si esta noche la alerta corresponde a lo que hay o no (D10). */
  dice_la_verdad: boolean;
  /**
   * Si volvió de explorar la noche anterior (A2), el nombre del tramo más
   * duro entre los candidatos de ESTA noche. Público, igual que `alerta`: es
   * lo que se gana a cambio de arriesgarlo. Solo dura una noche — la próxima
   * transición reconstruye `perro` entero y lo omite salvo que haya vuelto a
   * explorar con éxito otra vez.
   */
  tramoRevelado?: string;
}

export interface EstadoObjeto {
  readonly id: ObjetoId;
  /** Arquetipo del mazo del tablero. El efecto mecánico sale de acá, no del LLM. */
  arquetipo: string;
  portador?: JugadorId;
  /** Todos se degradan. A 0 se cae solo. */
  usosRestantes: number;
  /** Los "no identificados" no muestran su efecto hasta que se usan. */
  identificado: boolean;
}

/** Un tramo candidato de esta noche. El Baqueano ve el terreno de uno solo. */
export interface Tramo {
  readonly id: TramoId;
  nombre: string;
  /** Leguas que descuenta del avance. Oculto salvo para quien ve el terreno. */
  dureza: number;
  /** Modificador al consumo del recurso crítico. Oculto. */
  costoRecurso: number;
  /** Probabilidad de hallazgo de objeto. Oculto. */
  hallazgo: number;
  /** Lo que sí está a la vista de todos en la TV: dos palabras, nada de números. */
  pista: string;
}

export interface EstadoNoche {
  numero: number;
  /** Los tramos entre los que se elige esta noche. */
  candidatos: Tramo[];
  /** Boletas bloqueadas, por jugador. Secretas hasta que resuelve la noche. */
  boletas: Record<JugadorId, Boleta>;
  /**
   * A quiénes manda al trabajo pesado esta noche. Lo decide el Capataz (o cada
   * uno de sí mismo, si no hay Capataz en la mesa) con el comando
   * `asignar_esfuerzo`, independiente de la boleta: no hace falta haber
   * bloqueado ruta y raciones para asignar esfuerzo, ni al revés.
   * `undefined` hasta que se manda el primer `asignar_esfuerzo` de la noche.
   */
  esfuerzoAsignado?: JugadorId[];
  /**
   * Quiénes ya mandaron su `asignar_esfuerzo` esta noche.
   *
   * No se puede derivar de `esfuerzoAsignado`: alguien que se ofreció y alguien
   * que dijo que no dejan la lista igual, y el Capataz que reparte "a nadie"
   * manda una lista vacía. Sin este registro, el celular no puede saber si ya
   * respondió y tiene que recordarlo en estado local — que se pierde al
   * recargar y contradice D4 (el estado vive en el servidor).
   */
  esfuerzoRespondieron?: JugadorId[];
  /**
   * El Capataz lo mandó a explorar esta noche (A2, D10). Independiente del
   * esfuerzo y de la boleta: es una decisión propia, con el comando
   * `mandar_perro_a_explorar`. Público desde que se manda — se dice en voz
   * alta — así que no hace falta un `perroExploroRespondio` al estilo de
   * `esfuerzoRespondieron`: acá "no mandado" y "mandado" no se confunden,
   * porque no hay equivalente a la lista vacía.
   */
  perroExplorando?: boolean;
  /**
   * El Capataz ya respondió por el perro esta noche, haya dicho que sí o que no.
   *
   * No se puede derivar de `perroExplorando`: "que se quede" y "todavía no
   * contestó" son los dos `perroExplorando !== true`. Es el mismo motivo por el
   * que existe `esfuerzoRespondieron` — sin esto, el celular tiene que
   * acordarse en estado local de que ya dijo que no, se pierde al recargar y la
   * pantalla vuelve a aparecer a mitad de la noche (D4).
   */
  perroDecidido?: boolean;
  /** Marca de tiempo del servidor en la que vence la ventana de decisión. */
  venceEn: number;
}

/** Lo que un jugador bloqueó en su celular. Se discute en voz alta, se bloquea en secreto. */
export interface Boleta {
  ruta: TramoId;
  raciones: NivelRaciones;
  bloqueadaEn: number;
}

export type NivelRaciones = 'ajustado' | 'normal' | 'abundante';

/** Lo que efectivamente se decidió, después de contar las boletas. */
export interface DecisionNoche {
  ruta: TramoId;
  raciones: NivelRaciones;
  esfuerzo: JugadorId[];
  /** Cómo se resolvió: sirve para la crónica y para explicar el resultado en la TV. */
  via: 'mayoria' | 'desempate_capataz' | 'capataz_solo' | 'oposicion_unanime' | 'vencio_el_tiempo';
}

/**
 * Lo que se revela en el fogón (D18): quién votó qué, con nombre, y cómo se
 * resolvió. Se computa en `resolverNoche()` con los nombres ya resueltos a
 * texto — no se deriva de `nocheActual.boletas` en la proyección, porque al
 * pasar de `resolver` a `epilogo` la máquina borra `nocheActual` entero
 * (ver el destructuring en `maquina.ts`), y la última noche tiene que poder
 * revelarse igual.
 */
export interface RevelacionBoletas {
  noche: number;
  ruta: { nombre: string; votantes: string[]; gano: boolean }[];
  raciones: { nivel: NivelRaciones; votantes: string[]; gano: boolean }[];
  /** Nombres de quienes fueron al trabajo pesado. */
  esfuerzo: string[];
  /**
   * Nombre del Capataz, solo si efectivamente repartió esta noche. Si no hay
   * Capataz en la mesa (esfuerzo voluntario) o no llegó a repartir, no va:
   * ponerlo igual haría que la TV le atribuyera un reparto que no hizo.
   */
  repartio?: string;
  /**
   * Cómo se resolvió **la ruta**. Raciones se cuenta por separado y tiene su
   * propio desempate (03-reglas-de-resolucion.md § Conteo de boletas), así que
   * esto no se puede mostrar como si aplicara a las dos dimensiones.
   */
  via: DecisionNoche['via'];
}

/** Una línea de la crónica. Es el producto real de la partida: la anécdota. */
export interface EntradaCronica {
  noche: number;
  /** Hechos que produjo el motor. El texto se escribe sobre esto, nunca al revés. */
  hechos: string[];
  /** La piel que escribió el modelo, o el respaldo del tablero si no llegó a tiempo. */
  relato: string;
  origen: 'modelo' | 'respaldo';
}

export interface EstadoPartida {
  readonly id: PartidaId;
  readonly tablero: TableroId;
  readonly semilla: string;
  fase: Fase;
  noche: number;
  /** Cuántas noches tiene esta travesía. Sale del tablero. */
  nochesTotales: number;
  /** Leguas recorridas sobre el total del tablero. */
  avance: number;
  distanciaTotal: number;
  /** Recurso crítico del tablero: raciones en La Sierra, agua en El Salitral. */
  recurso: number;
  capacidad: number;
  viajeros: Viajero[];
  perro: EstadoPerro;
  objetos: EstadoObjeto[];
  nocheActual?: EstadoNoche;
  cronica: EntradaCronica[];
  /** A quién se le ofreció el trato esta travesía, si a alguien. */
  tratoOfrecidoA?: JugadorId;
  /**
   * En qué noche se ofrece el trato esta travesía, si se ofrece (D9). Se
   * decide una sola vez, al `empezar`, tirando `TRATO.probabilidadDeNoOfrecer`
   * y —si no sale eso— sorteando la noche dentro de `TRATO.nocheMin`–
   * `nocheMax` (ver `maquina.ts`). `undefined` significa que esta travesía no
   * lo ofrece a nadie; no confundir con "todavía no se decidió", que no
   * existe: se decide de una vez al empezar.
   */
  nocheTrato?: number;
  /**
   * Quiénes fueron al trabajo pesado la noche anterior. No se puede mandar a
   * la misma persona dos noches seguidas (D19): esto es lo que hace esa regla
   * cumplible sin tener que releer la crónica entera. Vacío al crear la
   * partida y se reescribe entero al cerrar cada noche.
   */
  esfuerzoNocheAnterior: JugadorId[];
  /**
   * Lo que se reveló al cerrar la última noche resuelta: quién votó qué y a
   * quién se mandó al esfuerzo (D18). Sobrevive el pasaje a `epilogo` a
   * propósito — ver `RevelacionBoletas`.
   */
  ultimaRevelacion?: RevelacionBoletas;
  /** Se llena en el epílogo. */
  desenlace?: Desenlace;
}

export interface Desenlace {
  llegaron: boolean;
  /** Objetivos personales cumplidos. Se revela todo junto, al final. */
  objetivosCumplidos: JugadorId[];
  perroLlego: boolean;
}
