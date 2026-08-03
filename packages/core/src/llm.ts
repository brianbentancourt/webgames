/**
 * Contrato con el modelo (D5).
 *
 * El motor arma un menú de jugadas válidas y una lista de hechos ya resueltos.
 * El modelo elige una opción del menú y escribe la piel. No calcula, no recuerda,
 * no decide nada que el motor no haya puesto en `menu`.
 *
 * Si la respuesta no valida, se usa el respaldo del tablero y la partida sigue.
 * Que el modelo falle nunca puede frenar una mesa.
 */

export type Escena = 'resolucion' | 'fogon' | 'trato' | 'apodo' | 'epilogo';

export interface OpcionMenu {
  /** Identificador que el modelo tiene que devolver tal cual. */
  id: string;
  /** Qué significa mecánicamente. El modelo lee esto para elegir con criterio. */
  que: string;
}

export interface PedidoRelato {
  escena: Escena;
  /** Registro del relato del tablero: seco, deadpan, nunca solemne. */
  voz: string;
  /** Lo que efectivamente pasó, ya calculado. El texto se escribe sobre esto. */
  hechos: string[];
  /** De acá elige. Si está vacío, solo escribe. */
  menu: OpcionMenu[];
  /** La TV se mira de reojo: el texto es corto o no se lee. */
  limitePalabras: number;
  /** Fondos disponibles de la librería propia. Nada de generar imágenes en vivo. */
  fondos: string[];
}

export interface RespuestaRelato {
  /** Id de una opción del menú. Obligatorio si `menu` no venía vacío. */
  opcion?: string;
  texto: string;
  /** Uno de los `fondos` del pedido. */
  fondo?: string;
}

export interface Respaldo {
  texto: string;
  opcion?: string;
}

export type ResultadoRelato = RespuestaRelato & { origen: 'modelo' | 'respaldo' };

/**
 * Filtro de entrada de todo lo que devuelve el modelo. Un texto largo de más se
 * recorta; una opción inventada tira la respuesta entera al respaldo.
 */
export function validarRelato(
  pedido: PedidoRelato,
  cruda: unknown,
  respaldo: Respaldo,
): ResultadoRelato {
  const alRespaldo = (): ResultadoRelato => ({ ...respaldo, origen: 'respaldo' });

  if (typeof cruda !== 'object' || cruda === null) return alRespaldo();
  const r = cruda as Record<string, unknown>;

  if (typeof r['texto'] !== 'string' || r['texto'].trim().length === 0) return alRespaldo();

  const opcion = typeof r['opcion'] === 'string' ? r['opcion'] : undefined;
  if (pedido.menu.length > 0) {
    if (opcion === undefined || !pedido.menu.some((o) => o.id === opcion)) return alRespaldo();
  }

  const fondo = typeof r['fondo'] === 'string' && pedido.fondos.includes(r['fondo'])
    ? r['fondo']
    : undefined;

  const palabras = r['texto'].trim().split(/\s+/);
  const texto =
    palabras.length > pedido.limitePalabras
      ? palabras.slice(0, pedido.limitePalabras).join(' ') + '…'
      : r['texto'].trim();

  return {
    texto,
    origen: 'modelo',
    ...(opcion !== undefined ? { opcion } : {}),
    ...(fondo !== undefined ? { fondo } : {}),
  };
}
