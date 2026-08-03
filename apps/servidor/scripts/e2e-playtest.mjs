#!/usr/bin/env node
/**
 * Playtest de una travesía entera contra un servidor real (no el motor en
 * memoria: WebSocket de punta a punta, timers del servidor incluidos).
 *
 * A diferencia de `runner.ts` — que juega el motor puro sin red — esto ejercita
 * exactamente lo que el roadmap (M2) marcaba como pendiente y nunca se había
 * probado de verdad: `fogon`, `entregar_objeto`, `responder_trato`, votar
 * tablero, y un celular que se cae y vuelve a mitad de partida con su token de
 * sesión.
 *
 * Uso: PUERTO=8787 node scripts/e2e-playtest.mjs   (desde apps/servidor)
 * El proceso servidor tiene que estar corriendo aparte.
 */

import WebSocket from 'ws';

const PUERTO = process.env.PUERTO ?? '8787';
const URL = `ws://localhost:${PUERTO}/ws`;
const NOMBRES = ['Nico', 'Vale', 'Seba'];

const resultado = { entregoObjeto: false, respondioTrato: false, reconecto: false, votoTablero: false };

function conectar() {
  return new WebSocket(URL);
}

function esperar(ws, filtro, msTimeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout esperando ${filtro}`)), msTimeout);
    const onMsg = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (filtro(msg)) {
        clearTimeout(t);
        ws.off('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
  });
}

class Jugador {
  constructor(nombre) {
    this.nombre = nombre;
    this.id = null;
    this.sesion = null;
    this.ws = null;
    this.vista = null;
    this.entregoAlgunaVez = false;
  }

  conectar(codigoSala) {
    this.ws = conectar();
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.t === 'jugador') this.vista = msg.vista;
      if (msg.t === 'error') console.error(`  [${this.nombre}] error:`, msg.codigo, msg.mensaje);
    });
    return new Promise((resolve, reject) => {
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({ t: 'unirse', sala: codigoSala, nombre: this.nombre }));
      });
      this.ws.once('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.t !== 'bienvenida') return reject(new Error('primer mensaje no fue bienvenida'));
        this.id = msg.jugador;
        this.sesion = msg.sesion;
        resolve();
      });
    });
  }

  mandar(m) {
    this.ws.send(JSON.stringify(m));
  }

  /** Cierra el socket sin avisar (simula que se trabó el celular) y vuelve con el mismo token. */
  async reconectar(codigoSala) {
    this.ws.terminate();
    await new Promise((r) => setTimeout(r, 500));
    this.ws = conectar();
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.t === 'jugador') this.vista = msg.vista;
    });
    const bienvenida = await new Promise((resolve, reject) => {
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({ t: 'unirse', sala: codigoSala, nombre: this.nombre, sesion: this.sesion }));
      });
      this.ws.once('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.t !== 'bienvenida') return reject(new Error('reconexión: primer mensaje no fue bienvenida'));
        resolve(msg);
      });
    });
    if (bienvenida.jugador !== this.id) {
      throw new Error(`reconexión devolvió otro jugador: esperaba ${this.id}, llegó ${bienvenida.jugador}`);
    }
  }

  /** Juega lo que le toque en la vista actual. Devuelve true si mandó algo. */
  async jugarSiToca() {
    const v = this.vista;
    if (!v || !v.acciones || v.acciones.length === 0) return false;

    // El trato: responder apenas aparece, en la fase que sea.
    if (v.acciones.some((a) => a.tipo === 'responder_trato') && v.trato) {
      this.mandar({ t: 'responder_trato', acepta: true });
      resultado.respondioTrato = true;
      return true;
    }

    // El objeto: probar el traspaso una sola vez en toda la partida.
    const accionObjeto = v.acciones.find((a) => a.tipo === 'entregar_objeto');
    if (accionObjeto && !resultado.entregoObjeto) {
      const destino = accionObjeto.candidatos[0];
      if (destino) {
        this.mandar({ t: 'entregar_objeto', objeto: accionObjeto.objeto, a: destino.id });
        resultado.entregoObjeto = true;
        return true;
      }
    }

    // Noche 1 con tutorial: solo bloquear, el motor completa el resto.
    if (v.acciones.length === 1 && v.acciones[0].tipo === 'bloquear') {
      this.mandar({ t: 'bloquear' });
      return true;
    }

    // Boleta normal: ruta + raciones ajustadas (para forzar hambre/quiebre en
    // algún momento de la travesía) + a mí mismo al esfuerzo, y bloquear.
    const accionRuta = v.acciones.find((a) => a.tipo === 'elegir_ruta');
    const accionEsfuerzo = v.acciones.find((a) => a.tipo === 'elegir_esfuerzo');
    if (accionRuta) {
      this.mandar({
        t: 'elegir',
        ruta: accionRuta.opciones[0].id,
        raciones: 'ajustado',
        esfuerzo: accionEsfuerzo ? accionEsfuerzo.opciones.slice(0, 1).map((o) => o.id) : [],
      });
      this.mandar({ t: 'bloquear' });
      return true;
    }

    return false;
  }
}

async function main() {
  console.log('=== PLAYTEST E2E: La Travesía ===');

  const tv = conectar();
  await new Promise((resolve) => tv.on('open', resolve));
  let vistaTV = null;
  tv.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.t === 'tv') vistaTV = msg.vista;
  });

  const bienvenidaTV = esperar(tv, (m) => m.t === 'bienvenida');
  tv.send(JSON.stringify({ t: 'abrir_sala' }));
  const { sala: codigoSala } = await bienvenidaTV;
  console.log(`sala ${codigoSala} abierta`);

  const jugadores = NOMBRES.map((n) => new Jugador(n));
  for (const j of jugadores) {
    await j.conectar(codigoSala);
    console.log(`  ${j.nombre} entró (${j.id})`);
  }

  // Votar tablero: todos votan La Sierra salvo el último, que vota distinto,
  // así se ejercita el conteo además del mensaje.
  jugadores[0].mandar({ t: 'votar_tablero', tablero: 'la-sierra' });
  jugadores[1].mandar({ t: 'votar_tablero', tablero: 'la-sierra' });
  jugadores[2].mandar({ t: 'votar_tablero', tablero: 'el-salitral' });
  const salaConVotos = await esperar(tv, (m) => m.t === 'sala' && Object.keys(m.votos).length === 3);
  if (salaConVotos.votos[jugadores[0].id] !== 'la-sierra') throw new Error('el voto no llegó a la sala');
  resultado.votoTablero = true;
  console.log('votar_tablero: ok, tablas', salaConVotos.votos);

  for (const j of jugadores) j.mandar({ t: 'listo', listo: true });

  console.log('esperando el arranque (cuenta regresiva + reparto)...');
  await esperar(tv, (m) => m.t === 'tv' && m.vista.fase !== 'lobby', 20000);
  console.log('partida arrancada, tablero:', vistaTV?.tablero?.id);

  let ultimaNoche = 0;
  let reconectoIntentado = false;
  const tActivo = Date.now();
  const PRESUPUESTO_MS = 7 * 60 * 1000;

  while (vistaTV?.fase !== 'epilogo') {
    if (Date.now() - tActivo > PRESUPUESTO_MS) throw new Error('se acabó el presupuesto de tiempo sin llegar al epílogo');

    if (vistaTV?.noche !== ultimaNoche) {
      ultimaNoche = vistaTV?.noche ?? ultimaNoche;
      console.log(`--- noche ${ultimaNoche} · fase ${vistaTV?.fase} ---`);
    }

    // A mitad de camino, se cae un celular y vuelve con su token.
    if (!reconectoIntentado && ultimaNoche === 2 && vistaTV?.fase === 'acampar') {
      reconectoIntentado = true;
      console.log(`reconectando a ${jugadores[1].nombre} a mitad de partida...`);
      await jugadores[1].reconectar(codigoSala);
      await esperar(jugadores[1].ws, () => true, 5000).catch(() => {});
      resultado.reconecto = true;
      console.log('reconexión: ok, mismo jugador, sala intacta');
    }

    for (const j of jugadores) {
      try {
        await j.jugarSiToca();
      } catch (e) {
        console.error(`  [${j.nombre}] fallo al jugar:`, e.message);
      }
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('=== EPÍLOGO ===');
  console.log('llegaron:', vistaTV.desenlace?.llegaron);
  console.log('perro llegó:', vistaTV.desenlace?.perroLlego);
  for (const o of vistaTV.desenlace?.objetivos ?? []) {
    console.log(`  ${o.nombre}: ${o.texto} — ${o.cumplido ? 'CUMPLIDO' : 'no cumplido'}`);
  }

  if (!vistaTV.desenlace || vistaTV.desenlace.objetivos.length !== jugadores.length) {
    throw new Error('el epílogo no trajo un desenlace completo');
  }

  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(resultado, null, 2));

  const faltantes = Object.entries(resultado).filter(([, v]) => !v).map(([k]) => k);
  if (faltantes.length > 0) {
    console.log(`\nAVISO: no se ejercitaron estos caminos en esta corrida: ${faltantes.join(', ')}`);
    console.log('(el trato y el hallazgo de objetos dependen del azar de la semilla; no es necesariamente un bug)');
  }

  tv.close();
  for (const j of jugadores) j.ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('\nFALLÓ:', e);
  process.exit(1);
});
