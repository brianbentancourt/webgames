/**
 * La capa del modelo. Un solo lugar en todo el proyecto habla con la API.
 *
 * Tres reglas que no se negocian (D5, D6):
 *  1. El modelo elige de un menú que le arma el motor. Nunca calcula estado.
 *  2. Hay presupuesto de tiempo. Si vence, va el respaldo del tablero y la mesa sigue.
 *  3. Todo lo que vuelve pasa por validarRelato() antes de tocar el estado.
 *
 * ESTADO: sin implementar la llamada real. Con `pedirRelato` tal como está, el juego
 * es jugable de punta a punta con los textos de respaldo — que es exactamente el
 * comportamiento que se quiere cuando la red está mal.
 */

import { TIEMPOS, validarRelato, type PedidoRelato, type Respaldo, type ResultadoRelato } from '@travesia/core';
import { config } from '../config.js';

export async function pedirRelato(
  pedido: PedidoRelato,
  respaldo: Respaldo,
): Promise<ResultadoRelato> {
  if (config.ANTHROPIC_API_KEY === undefined) {
    return { ...respaldo, origen: 'respaldo' };
  }

  const corte = AbortSignal.timeout(TIEMPOS.llmPresupuestoMs);
  try {
    const cruda = await llamar(pedido, corte);
    return validarRelato(pedido, cruda, respaldo);
  } catch {
    // Timeout, 500, corte de red: da igual cuál. La partida no espera al modelo.
    return { ...respaldo, origen: 'respaldo' };
  }
}

async function llamar(_pedido: PedidoRelato, _corte: AbortSignal): Promise<unknown> {
  throw new Error('llamar(): sin implementar. Ver docs/specs/07-capa-llm.md');
}
