/**
 * La capa del modelo. Un solo lugar en todo el proyecto habla con la API.
 *
 * Tres reglas que no se negocian (D5, D6):
 *  1. El modelo elige de un menú que le arma el motor. Nunca calcula estado.
 *  2. Hay presupuesto de tiempo. Si vence, va el respaldo del tablero y la mesa sigue.
 *  3. Todo lo que vuelve pasa por validarRelato() antes de tocar el estado.
 *
 * Llama a Groq (API compatible con OpenAI) porque es gratis y rápida, que acá pesa
 * más que la calidad de la prosa (07-capa-llm.md § Costo y modelo). Sin
 * `GROQ_API_KEY` el juego es jugable de punta a punta igual, con los textos de
 * respaldo — que es exactamente el comportamiento que se quiere cuando la red
 * está mal.
 */

import { TIEMPOS, validarRelato, type PedidoRelato, type Respaldo, type ResultadoRelato } from '@salvese/core';
import { config } from '../config.js';

export async function pedirRelato(
  pedido: PedidoRelato,
  respaldo: Respaldo,
): Promise<ResultadoRelato> {
  if (config.GROQ_API_KEY === undefined) {
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

/** Arma el pedido en texto plano: los hechos son la única fuente de verdad (D5). */
function armarPrompt(pedido: PedidoRelato): { sistema: string; usuario: string } {
  const forma = [
    '"texto": string',
    pedido.menu.length > 0 ? '"opcion": string' : null,
    pedido.fondos.length > 0 ? '"fondo": string' : null,
  ].filter((x) => x !== null);

  const sistema =
    `Sos la voz de un camino en un juego de mesa. ${pedido.voz}\n` +
    `Los hechos que te pasan son notas de un cronista, no la crónica: no los enumeres ni los ` +
    `pegues uno atrás del otro. Elegí uno o dos que importen y contalos en prosa corrida, ` +
    `como una sola escena. Los hechos que no uses no pasa nada, se pierden.\n` +
    `No inventes ningún número, cantidad, nombre, lugar o detalle que no esté ya escrito en los ` +
    `hechos. Si mencionás una cifra, tiene que ser copiada tal cual de un hecho, nunca una que ` +
    `vos calcules o imagines — ni "como 10", ni redondeada, ni de relleno. Si un hecho no trae ` +
    `número, contalo sin inventarle uno.\n` +
    `Respondé SOLO un objeto JSON, sin texto antes ni después, con esta forma exacta: ` +
    `{ ${forma.join(', ')} }. "texto" no puede superar las ${pedido.limitePalabras} palabras.`;

  const lineas = ['Hechos de esta noche (la única verdad; no inventes otros ni los repitas todos):', ...pedido.hechos.map((h) => `- ${h}`)];

  if (pedido.menu.length > 0) {
    lineas.push('', 'Elegí una de estas opciones y devolvé su id tal cual en "opcion":');
    lineas.push(...pedido.menu.map((o) => `- ${o.id}: ${o.que}`));
  }
  if (pedido.fondos.length > 0) {
    lineas.push('', `Elegí uno de estos fondos para "fondo": ${pedido.fondos.join(', ')}`);
  }

  return { sistema, usuario: lineas.join('\n') };
}

async function llamar(pedido: PedidoRelato, corte: AbortSignal): Promise<unknown> {
  const { sistema, usuario } = armarPrompt(pedido);

  const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: corte,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.MODELO,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`groq respondió ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as { choices?: { message?: { content?: string } }[] };
  const contenido = datos.choices?.[0]?.message?.content;
  if (typeof contenido !== 'string') {
    throw new Error('groq: respuesta sin contenido');
  }
  return JSON.parse(contenido);
}
