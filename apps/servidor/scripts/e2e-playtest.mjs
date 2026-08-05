#!/usr/bin/env node
/**
 * Playtest de una travesía entera contra un servidor real (no el motor en
 * memoria: WebSocket de punta a punta, timers del servidor incluidos).
 *
 * A diferencia de `runner.ts` — que juega el motor puro sin red — esto ejercita
 * exactamente lo que el roadmap (M2) marcaba como pendiente y nunca se había
 * probado de verdad: `fogon`, `entregar_objeto`, `responder_trato`, votar
 * tablero, `mandar_perro_a_explorar` (A2), y un celular que se cae y vuelve a
 * mitad de partida con su token de sesión.
 *
 * Uso: PUERTO=8787 node scripts/e2e-playtest.mjs   (desde apps/servidor)
 * El proceso servidor tiene que estar corriendo aparte.
 */

import WebSocket from 'ws';

const PUERTO = process.env.PUERTO ?? '8787';
const URL = `ws://localhost:${PUERTO}/ws`;
/**
 * Cinco, no tres: con tres jugadores `REPARTO` no pone Capataz en la mesa, así
 * que el esfuerzo cae siempre en el modo voluntario y el reparto del Capataz
 * —el corazón de D19— no se ejercita nunca. Con cinco hay Capataz y además es
 * el punto óptimo de diseño. La partida de 3 quedó cubierta por los tests del
 * motor, que sí prueban el modo voluntario.
 */
const NOMBRES = ['Nico', 'Vale', 'Seba', 'Pili', 'Tato'];

const resultado = {
  entregoObjeto: false,
  respondioTrato: false,
  reconecto: false,
  votoTablero: false,
  /** Alguien repartió el trabajo pesado (el Capataz, con 5 jugadores). */
  asignoEsfuerzo: false,
  /** El reparto lo mandó efectivamente el Capataz, no un voluntario. */
  repartioCapataz: false,
  /** La TV mostró la revelación de boletas en el fogón (D18). */
  vioRevelacion: false,
  /** El Capataz mandó al perro a explorar (A2), desde la noche 3. */
  mandoPerro: false,
  /** El Capataz respondió "que se quede": es una decisión registrada, no un silencio. */
  dejoAlPerro: false,
  /** La TV mostró `perro.explorando` mientras se esperaba el resultado (A2). */
  vioPerroExplorando: false,
  /** Resultado de la exploración: se pierde o vuelve. Random por semilla — se registra, no se fuerza. */
  perroResultado: /** @type {'perdido' | 'volvio' | null} */ (null),
};

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

    // El reparto del esfuerzo (D19) es independiente de la boleta. El servidor
    // dice con `yaReparti` si este jugador ya mandó el suyo esta noche, así que
    // no hace falta recordarlo del lado del bot: es el mismo dato que usa el
    // celular real. Con 5 jugadores hay Capataz en la mesa (REPARTO), así que
    // esto ejercita el reparto de verdad y no el modo voluntario.
    let hizoAlgo = false;
    const accionEsfuerzo = v.acciones.find((a) => a.tipo === 'repartir_esfuerzo');
    if (accionEsfuerzo && !accionEsfuerzo.yaReparti) {
      const disponibles = accionEsfuerzo.opciones.filter((o) => o.disponible);
      const a = disponibles.slice(0, accionEsfuerzo.max).map((o) => o.id);
      this.mandar({ t: 'asignar_esfuerzo', a });
      resultado.asignoEsfuerzo = true;
      if (accionEsfuerzo.modo === 'capataz') resultado.repartioCapataz = true;
      hizoAlgo = true;
    }

    // Mandar al perro a explorar (A2): disponible desde la noche 3, solo
    // para el Capataz. El bot lo manda la primera vez que puede, para
    // ejercitar el comando de punta a punta contra un servidor real.
    // `yaDecidio`, no `yaMandado`: "que se quede" también es una respuesta
    // registrada en el servidor, y con `yaMandado` el bot volvería a
    // preguntar cada tick después de decir que no.
    const accionPerro = v.acciones.find((a) => a.tipo === 'mandar_perro');
    if (accionPerro && !accionPerro.yaDecidio) {
      // Lo manda la primera vez que puede y después dice que no, para
      // ejercitar las dos respuestas contra un servidor real.
      const manda = !resultado.mandoPerro;
      this.mandar({ t: 'mandar_perro_a_explorar', manda });
      if (manda) resultado.mandoPerro = true;
      else resultado.dejoAlPerro = true;
      hizoAlgo = true;
    }

    // Noche 1 con tutorial: solo bloquear, el motor completa el resto.
    if (v.acciones.length === 1 && v.acciones[0].tipo === 'bloquear') {
      this.mandar({ t: 'bloquear' });
      return true;
    }

    // Boleta normal: ruta + raciones ajustadas (para forzar hambre/quiebre en
    // algún momento de Sálvese quien pueda!), y bloquear.
    const accionRuta = v.acciones.find((a) => a.tipo === 'elegir_ruta');
    if (accionRuta) {
      this.mandar({
        t: 'elegir',
        ruta: accionRuta.opciones[0].id,
        raciones: 'ajustado',
      });
      this.mandar({ t: 'bloquear' });
      return true;
    }

    return hizoAlgo;
  }
}

async function main() {
  console.log('=== PLAYTEST E2E: Sálvese quien pueda! ===');

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
  jugadores.forEach((j, i) => {
    j.mandar({ t: 'votar_tablero', tablero: i === jugadores.length - 1 ? 'el-salitral' : 'la-sierra' });
  });
  const salaConVotos = await esperar(
    tv,
    (m) => m.t === 'sala' && Object.keys(m.votos).length === jugadores.length,
  );
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

    // La revelación de boletas (D18) es secreta durante la ventana: que salga
    // antes del fogón es el bug que rompe el juego de información oculta, así
    // que el playtest falla en vez de avisar.
    if (vistaTV?.revelacion && vistaTV.fase !== 'fogon' && vistaTV.fase !== 'epilogo') {
      throw new Error(`la revelación de boletas se filtró en fase ${vistaTV.fase}`);
    }
    if (vistaTV?.fase === 'fogon' && vistaTV.revelacion) {
      if (!resultado.vioRevelacion) {
        console.log(
          `  fogón revela: ruta ganadora "${vistaTV.revelacion.ruta.find((r) => r.gano)?.nombre}"` +
            `, esfuerzo [${vistaTV.revelacion.esfuerzo.join(', ')}]` +
            `${vistaTV.revelacion.repartio ? ` — repartió ${vistaTV.revelacion.repartio}` : ''}`,
        );
      }
      resultado.vioRevelacion = true;
    }

    // El perro explorando (A2) es dato público: la TV lo tiene que ver apenas
    // el Capataz lo manda, sin esperar a que resuelva la noche.
    if (vistaTV?.perro?.explorando && !resultado.vioPerroExplorando) {
      resultado.vioPerroExplorando = true;
      console.log(`  el perro está explorando (noche ${vistaTV.noche})`);
    }
    if (resultado.mandoPerro && resultado.perroResultado === null) {
      if (vistaTV?.perro?.presente === false) {
        resultado.perroResultado = 'perdido';
        console.log(`  el perro se perdió explorando (noche ${vistaTV.noche})`);
      } else if (vistaTV?.perro?.tramoRevelado) {
        resultado.perroResultado = 'volvio';
        console.log(`  el perro volvió: no miente, el tramo más duro es "${vistaTV.perro.tramoRevelado}"`);
      }
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
  console.log('mandó a explorar (A2):', resultado.mandoPerro, '· resultado:', resultado.perroResultado ?? 'sin resolver todavía');
  for (const o of vistaTV.desenlace?.objetivos ?? []) {
    console.log(`  ${o.nombre}: ${o.texto} — ${o.cumplido ? 'CUMPLIDO' : 'no cumplido'}`);
  }

  if (!vistaTV.desenlace || vistaTV.desenlace.objetivos.length !== jugadores.length) {
    throw new Error('el epílogo no trajo un desenlace completo');
  }

  // La última noche va de `resolver` directo a `epilogo` salteando el fogón: si
  // su revelación no llega acá, no se muestra en ninguna parte (D18).
  if (!vistaTV.revelacion) {
    throw new Error('el epílogo no trajo la revelación de la última noche');
  }
  console.log(`revelación de la última noche: noche ${vistaTV.revelacion.noche}, vía ${vistaTV.revelacion.via}`);

  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(resultado, null, 2));

  const faltantes = Object.entries(resultado).filter(([, v]) => !v).map(([k]) => k);
  if (faltantes.length > 0) {
    console.log(`\nAVISO: no se ejercitaron estos caminos en esta corrida: ${faltantes.join(', ')}`);
    console.log(
      '(el trato, el hallazgo de objetos y si el perro se pierde al explorar dependen del azar ' +
        'de la semilla; no es necesariamente un bug)',
    );
  }

  tv.close();
  for (const j of jugadores) j.ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('\nFALLÓ:', e);
  process.exit(1);
});
