#!/usr/bin/env node
/**
 * Verifica en un Chromium real que `prefers-reduced-motion: reduce` efectivamente
 * acorta la cutscene de resolución (08-cliente-tv.md § Accesibilidad), no solo que
 * la media query esté declarada en el CSS.
 *
 * Corre dos partidas cortas —una con la preferencia activada, otra sin ella— y
 * compara la duración de animación real que el navegador calculó para
 * `.animar-resolucion` en cada una. Secuencial a propósito: la ventana de
 * `resolver` dura 7 segundos server-side y no vale la pena competir por CPU
 * entre dos partidas + dos Chromiums a la vez cuando lo que se mide es tiempo.
 *
 * Uso: node scripts/pw-reduced-motion.mjs   (servidor real corriendo en :8787)
 */

import { chromium } from 'playwright';
import WebSocket from 'ws';

const PUERTO = process.env.PUERTO ?? '8787';
const WS_URL = `ws://localhost:${PUERTO}/ws`;
const HTTP_URL = `http://localhost:${PUERTO}/travesia`;
const CHROMIUM_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function esperarMensaje(ws, filtro, msTimeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout esperando mensaje de ws')), msTimeout);
    ws.on('message', function onMsg(raw) {
      const msg = JSON.parse(raw.toString());
      if (filtro(msg)) {
        clearTimeout(t);
        ws.off('message', onMsg);
        resolve(msg);
      }
    });
  });
}

async function correrCaso(nombre, reducedMotion) {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
  const context = await browser.newContext({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  await page.goto(HTTP_URL, { waitUntil: 'networkidle' });

  const codigoSala = (await page.locator('.codigo').innerText({ timeout: 15000 })).trim();
  console.log(`[${nombre}] sala ${codigoSala} (reducedMotion=${reducedMotion})`);

  const jugadores = ['Nico', 'Vale', 'Seba'].map(() => new WebSocket(WS_URL));
  await Promise.all(jugadores.map((ws) => new Promise((r) => ws.on('open', r))));
  for (const ws of jugadores) {
    ws.send(JSON.stringify({ t: 'unirse', sala: codigoSala, nombre: 'J' + Math.random().toString(36).slice(2, 6) }));
    await esperarMensaje(ws, (m) => m.t === 'bienvenida');
  }
  for (const ws of jugadores) ws.send(JSON.stringify({ t: 'listo', listo: true }));

  const sonda = jugadores[0];
  await esperarMensaje(sonda, (m) => m.t === 'jugador' && m.vista.fase === 'acampar', 40000);
  await esperarMensaje(sonda, (m) => m.t === 'jugador' && m.vista.fase === 'decidir', 40000);
  console.log(`[${nombre}] llegó a decidir, bloqueando...`);

  // Se arma la espera del DOM ANTES de bloquear: `resolver` dura 7s server-side
  // y no hay margen para confirmar el estado del servidor primero y recién
  // después preguntarle al navegador — para cuando le preguntás, ya pasó.
  const esperaDom = page.waitForSelector('.panel-resolucion', { state: 'attached', timeout: 8000 });
  for (const ws of jugadores) ws.send(JSON.stringify({ t: 'bloquear' }));
  let elemento;
  try {
    elemento = await esperaDom;
  } catch (e) {
    const clase = await page.evaluate(() => document.querySelector('.juego-tv')?.className ?? '(sin .juego-tv)');
    console.log(`[${nombre}] DEBUG clase actual del contenedor:`, clase);
    throw e;
  }
  const duracion = await elemento.evaluate((el) => getComputedStyle(el).animationDuration);
  console.log(`[${nombre}] animation-duration calculada: ${duracion}`);

  for (const ws of jugadores) ws.close();
  await browser.close();
  return duracion;
}

async function main() {
  const normal = await correrCaso('normal', false);
  const reducido = await correrCaso('reducido', true);

  console.log('\n=== RESULTADO ===');
  console.log('sin preferencia:', normal);
  console.log('reduced-motion :', reducido);

  const aMs = (s) => parseFloat(s) * (s.includes('ms') ? 1 : 1000);
  const msNormal = aMs(normal);
  const msReducido = aMs(reducido);

  if (!(msReducido < msNormal)) {
    throw new Error(`prefers-reduced-motion no acortó nada: normal=${msNormal}ms, reducido=${msReducido}ms`);
  }
  if (msReducido > 500) {
    throw new Error(`reduced-motion sigue animando ${msReducido}ms; se esperaba ~300ms`);
  }

  console.log(`\nOK: reduced-motion pasó de ${msNormal}ms a ${msReducido}ms.`);
}

main().catch((e) => {
  console.error('\nFALLÓ:', e);
  process.exit(1);
});
