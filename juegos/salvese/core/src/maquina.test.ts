import { describe, test, expect, beforeAll } from 'vitest';
import { reducir, registrarTablero, obtenerTablero } from './maquina.js';
import { proyectarTV, proyectarJugador } from './vistas.js';
import type { EstadoPartida, Comando, RevelacionBoletas } from './index.js';
import { jugadorId, partidaId, tramoId } from './ids.js';
import { AVANCE, TRATO } from './config.js';
import { decidirPorVersion, VERSION_PROTOCOLO } from './protocolo.js';

// Datos estáticos mínimos de un tablero para los tests sin depender de archivos de otro proyecto si hay problemas
const tableroTest = {
  id: 'la-sierra',
  nombre: 'La Sierra',
  noches: 5,
  distancia: 24,
  recursoCritico: { id: 'raciones', nombre: 'raciones', inicial: 30, capacidad: 40 },
  tramos: [
    { id: 'cuesta-del-viento', nombre: 'la cuesta del viento', dureza: 2, costoRecurso: 1, hallazgo: 0.15, pista: 'sube', terreno: 'Piedra suelta todo el ascenso.' },
    { id: 'vado-bajo', nombre: 'el vado bajo', dureza: 0, costoRecurso: 0, hallazgo: 0.1, pista: 'agua cerca', terreno: 'Cómodo y sin sorpresas.' },
    { id: 'quebrada-seca', nombre: 'la quebrada seca', dureza: 1, costoRecurso: 2, hallazgo: 0.35, pista: 'atajo', terreno: 'Corta camino de verdad.' },
  ],
  mazoObjetos: [
    { id: 'catalejo-rajado', nombre: 'el catalejo rajado', clase: 'redistribuye' as const, efecto: '...', usos: 3 },
    { id: 'yunque-de-mano', nombre: 'el yunque de mano', clase: 'pesa' as const, efecto: '...', usos: 4 },
  ],
  objetivos: [
    { id: 'llegar-entero', texto: 'Llegar sin haberte quebrado nunca.', condicion: 'vigor > 0' },
    { id: 'que-nadie-quede', texto: 'Que ningún viajero termine quebrado.', condicion: '...' },
    { id: 'sobre-raciones', texto: 'Que sobren raciones al llegar.', condicion: '...' },
    { id: 'el-perro-llega', texto: 'Que el perro llegue.', condicion: '...' },
    { id: 'ver-el-final', texto: 'Llegar.', condicion: '...' },
  ],
  vozDelCamino: 'Voz del camino test',
  fondos: ['fogata-cerro'],
  respaldos: {
    resolucion: ['La caravana avanza.'],
    fogon: ['¿Quién decidió esto?'],
  },
};

// El Salitral tiene objetivos propios (agua-de-sobra, nunca-la-aguada,
// cruzar-la-sal) que el switch de evaluación de objetivos no cubría: caían
// todos en el `default` genérico (cumplido = llegaron) sin que ningún test lo
// notara, porque el único tablero de prueba era La Sierra.
const tableroSalitralTest = {
  id: 'el-salitral',
  nombre: 'El Salitral',
  noches: 5,
  distancia: 28,
  recursoCritico: { id: 'agua', nombre: 'agua', inicial: 24, capacidad: 30 },
  tramos: [
    { id: 'costra-blanca', nombre: 'la costra blanca', dureza: 1, costoRecurso: 2, hallazgo: 0.1, pista: 'plano', terreno: '...' },
    { id: 'la-aguada', nombre: 'la aguada', dureza: 2, costoRecurso: -2, hallazgo: 0.15, pista: 'desvío', terreno: '...' },
    { id: 'la-lengua-de-sal', nombre: 'la lengua de sal', dureza: 2, costoRecurso: 3, hallazgo: 0.5, pista: 'brilla', terreno: '...' },
  ],
  mazoObjetos: [
    { id: 'bordalesa', nombre: 'la bordalesa', clase: 'pesa' as const, efecto: '...', usos: 5 },
  ],
  objetivos: [
    { id: 'agua-de-sobra', texto: 'Llegar con agua de sobra.', condicion: 'recurso final >= 6' },
    { id: 'nunca-la-aguada', texto: 'Que no haya hecho falta desviarse nunca.', condicion: '...' },
    { id: 'cruzar-la-sal', texto: 'Haber cruzado la lengua de sal.', condicion: '...' },
    { id: 'que-nadie-quede', texto: 'Que ningún viajero termine quebrado.', condicion: '...' },
    { id: 'el-perro-llega', texto: 'Que el perro llegue.', condicion: '...' },
  ],
  vozDelCamino: 'Voz del camino test',
  fondos: ['salitral-luna'],
  respaldos: {
    resolucion: ['Se camina de noche.'],
    fogon: ['¿Cuánta agua creen que queda?'],
  },
};

beforeAll(() => {
  registrarTablero('la-sierra', tableroTest as any);
  registrarTablero('el-salitral', tableroSalitralTest as any);
});

describe('Motor de Reglas - Sálvese quien pueda!', () => {
  test('Inicialización con comando crear', () => {
    const partidaIdInicial = partidaId('partida-123');
    const estadoInicial: EstadoPartida = {
      id: partidaIdInicial,
      tablero: 'la-sierra' as any,
      semilla: 'test-seed',
      fase: 'lobby',
      noche: 0,
      nochesTotales: 0,
      avance: 0,
      distanciaTotal: 0,
      recurso: 0,
      capacidad: 0,
      viajeros: [],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [],
      esfuerzoNocheAnterior: [],
    };

    const r = reducir(estadoInicial, { t: 'crear', tablero: 'la-sierra' as any, semilla: 'test-seed' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.transicion.estado.fase).toBe('lobby');
      expect(r.transicion.estado.tablero).toBe('la-sierra');
      expect(r.transicion.estado.nochesTotales).toBe(5);
      expect(r.transicion.estado.recurso).toBe(30);
    }
  });

  test('Lobby: Sumar, quitar y listar viajeros', () => {
    let estado: EstadoPartida = {
      id: partidaId('partida-1'),
      tablero: 'la-sierra' as any,
      semilla: 'test-seed',
      fase: 'lobby',
      noche: 0,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [],
      esfuerzoNocheAnterior: [],
    };

    const j1 = jugadorId('j-1');
    const j2 = jugadorId('j-2');

    // Sumar jugador 1
    let r = reducir(estado, { t: 'sumar_jugador', jugador: j1, nombre: 'Nico' });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.viajeros.length).toBe(1);
    expect(estado.viajeros[0]?.nombre).toBe('Nico');

    // Sumar jugador 2
    r = reducir(estado, { t: 'sumar_jugador', jugador: j2, nombre: 'Vale' });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.viajeros.length).toBe(2);

    // Marcar listo
    r = reducir(estado, { t: 'marcar_listo', jugador: j1, listo: true });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Empezar falla si no están todos listos
    r = reducir(estado, { t: 'empezar' });
    expect(r.ok).toBe(false); // Vale no está lista

    // Marcar lista a Vale
    r = reducir(estado, { t: 'marcar_listo', jugador: j2, listo: true });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Empezar ahora si funciona
    r = reducir(estado, { t: 'empezar' });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('reparto');
    expect(estado.viajeros[0]?.rol).toBeDefined();
    expect(estado.viajeros[0]?.objetivo).toBeDefined();
  });

  test('Fase decidir y votación de boletas', () => {
    // Estado en acampar con 2 jugadores Nico y Vale
    let estado: EstadoPartida = {
      id: partidaId('partida-1'),
      tablero: 'la-sierra' as any,
      semilla: 'test-seed-2',
      fase: 'acampar',
      noche: 1,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 3, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      nocheActual: {
        numero: 1,
        candidatos: [
          { id: tramoId('cuesta-del-viento'), nombre: 'la cuesta del viento', dureza: 2, costoRecurso: 1, hallazgo: 0.15, pista: 'sube', terreno: '...' },
          { id: tramoId('vado-bajo'), nombre: 'el vado bajo', dureza: 0, costoRecurso: 0, hallazgo: 0.1, pista: 'agua', terreno: '...' },
        ] as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
      cronica: [],
      esfuerzoNocheAnterior: [],
    };

    // Acampar -> Decidir por timer vencido
    let r = reducir(estado, { t: 'vencio_fase' });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('decidir');

    // Nico vota cuesta del viento
    r = reducir(estado, {
      t: 'elegir',
      jugador: jugadorId('j-1'),
      ruta: tramoId('cuesta-del-viento'),
      raciones: 'normal',
    });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Vale vota vado bajo
    r = reducir(estado, {
      t: 'elegir',
      jugador: jugadorId('j-2'),
      ruta: tramoId('vado-bajo'),
      raciones: 'abundante',
    });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Nico bloquea
    r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-1') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('decidir'); // Sigue en decidir porque falta Vale

    // Vale bloquea -> Debería disparar la resolución de la noche inmediatamente
    r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-2') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('resolver'); // Se fue a resolver
    expect(estado.cronica.length).toBe(1);
    expect(estado.cronica[0]?.hechos).toBeDefined();
  });

  test('Test de Ocultación de Información / Proyecciones', () => {
    const estado: EstadoPartida = {
      id: partidaId('partida-1'),
      tablero: 'la-sierra' as any,
      semilla: 'secreto-1234',
      fase: 'decidir',
      noche: 1,
      nochesTotales: 5,
      avance: 5,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 2, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: false },
      objetos: [],
      nocheActual: {
        numero: 1,
        candidatos: [
          { id: tramoId('cuesta-del-viento'), nombre: 'la cuesta del viento', dureza: 2, costoRecurso: 1, hallazgo: 0.15, pista: 'sube', terreno: 'Terreno secreto del Baqueano.' },
        ] as any,
        boletas: {
          'j-1': { ruta: tramoId('cuesta-del-viento'), raciones: 'normal', bloqueadaEn: Date.now() },
        } as any,
        venceEn: Date.now() + 20000,
      },
      cronica: [],
      esfuerzoNocheAnterior: [],
    };

    // Proyección de la TV
    const tv = proyectarTV(estado);
    expect(tv.progreso).toBe(5 / 24);
    expect(tv.viajeros[0]?.aspecto).toBe('entero');
    expect(tv.viajeros[1]?.aspecto).toBe('cansado');

    // Proyección para Vale (Curandera)
    const vistaVale = proyectarJugador(estado, jugadorId('j-2'));
    const jsonVale = JSON.stringify(vistaVale);

    // Vale no debe conocer la semilla
    expect(jsonVale.includes('secreto-1234')).toBe(false);
    // Vale no debe conocer la verdad del perro
    expect(jsonVale.includes('dice_la_verdad')).toBe(false);
    // Vale no debe conocer el objetivo de Nico
    expect(jsonVale.includes('llegar-entero')).toBe(false);
    // Vale no debe ver el terreno secreto del Baqueano
    expect(jsonVale.includes('Terreno secreto del Baqueano')).toBe(false);
  });

  test('Objetivos propios de El Salitral se evalúan (no caen en el default)', () => {
    // Estado construido a mano justo antes del vencio_fase que cierra la
    // última noche: la crónica ya tiene lo que hizo falta que pasara.
    const estado: EstadoPartida = {
      id: partidaId('partida-salitral'),
      tablero: 'el-salitral' as any,
      semilla: 'test-salitral',
      fase: 'resolver',
      noche: 5,
      nochesTotales: 5,
      avance: 28,
      distanciaTotal: 28,
      recurso: 7,
      capacidad: 30,
      viajeros: [
        // Le sobra agua (recurso final 7 >= 6): cumple.
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'agua-de-sobra' as any, conectado: true, cegado: false, aceptoElTrato: false },
        // La caravana sí se desvió a la aguada (costoRecurso < 0) en la noche 2: no cumple.
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 3, objetivo: 'nunca-la-aguada' as any, conectado: true, cegado: false, aceptoElTrato: false },
        // Cruzaron la lengua de sal en la noche 4: cumple.
        { id: jugadorId('j-3'), nombre: 'Seba', rol: 'despensero', asiento: 2, vigor: 3, objetivo: 'cruzar-la-sal' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [
        { noche: 1, hechos: ['tramo:la costra blanca', 'avance:2', 'recurso:2'], relato: '...', origen: 'respaldo' },
        { noche: 2, hechos: ['tramo:la aguada', 'avance:2', 'recurso:2'], relato: '...', origen: 'respaldo' },
        { noche: 3, hechos: ['tramo:la costra blanca', 'avance:2', 'recurso:2'], relato: '...', origen: 'respaldo' },
        { noche: 4, hechos: ['tramo:la lengua de sal', 'avance:2', 'recurso:2'], relato: '...', origen: 'respaldo' },
        { noche: 5, hechos: ['tramo:la costra blanca', 'avance:2', 'recurso:2'], relato: '...', origen: 'respaldo' },
      ],
      esfuerzoNocheAnterior: [],
    };

    const r = reducir(estado, { t: 'vencio_fase' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.transicion.estado.fase).toBe('epilogo');
    const cumplidos = r.transicion.estado.desenlace?.objetivosCumplidos ?? [];
    expect(cumplidos).toContain(jugadorId('j-1')); // agua-de-sobra
    expect(cumplidos).not.toContain(jugadorId('j-2')); // nunca-la-aguada: se desviaron
    expect(cumplidos).toContain(jugadorId('j-3')); // cruzar-la-sal
  });
});

/**
 * Cirugía 2 (D19): el Capataz reparte el esfuerzo, no lo vota. Estos tests
 * fallan si alguien revierte la validación de `asignar_esfuerzo` o el conteo
 * de `resolverNoche()`.
 */
describe('Cirugía 2 — El Capataz reparte el esfuerzo', () => {
  function estadoDecidirConCapataz(overrides: Partial<EstadoPartida> = {}): EstadoPartida {
    return {
      id: partidaId('partida-esfuerzo-capataz'),
      tablero: 'la-sierra' as any,
      semilla: 'test-esfuerzo-capataz',
      fase: 'decidir',
      noche: 2,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 3, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-3'), nombre: 'Seba', rol: 'despensero', asiento: 2, vigor: 3, objetivo: 'sobre-raciones' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-4'), nombre: 'Cami', rol: 'capataz', asiento: 3, vigor: 3, objetivo: 'ver-el-final' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      nocheActual: {
        numero: 2,
        candidatos: tableroTest.tramos as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
      cronica: [],
      esfuerzoNocheAnterior: [],
      ...overrides,
    };
  }

  function estadoDecidirSinCapataz(overrides: Partial<EstadoPartida> = {}): EstadoPartida {
    return {
      id: partidaId('partida-esfuerzo-sin-capataz'),
      tablero: 'la-sierra' as any,
      semilla: 'test-esfuerzo-sin-capataz',
      fase: 'decidir',
      noche: 2,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 3, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      nocheActual: {
        numero: 2,
        candidatos: tableroTest.tramos as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
      cronica: [],
      esfuerzoNocheAnterior: [],
      ...overrides,
    };
  }

  test('Un no-Capataz que manda asignar_esfuerzo es rechazado si hay Capataz en la mesa', () => {
    const estado = estadoDecidirConCapataz();
    // Nico (baqueano) intenta mandar al esfuerzo, hasta a sí mismo: no es el Capataz.
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-1'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('Asignar a alguien que estuvo en esfuerzoNocheAnterior es rechazado', () => {
    const estado = estadoDecidirConCapataz({ esfuerzoNocheAnterior: [jugadorId('j-1')] });
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-4'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('Asignar a alguien con vigor 0 es rechazado', () => {
    const estado = estadoDecidirConCapataz();
    estado.viajeros[0] = { ...estado.viajeros[0]!, vigor: 0 };
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-4'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('El Capataz sí puede repartir a quien tiene vigor y no fue anoche', () => {
    const estado = estadoDecidirConCapataz();
    const r = reducir(estado, {
      t: 'asignar_esfuerzo',
      jugador: jugadorId('j-4'),
      a: [jugadorId('j-1'), jugadorId('j-2')],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.transicion.estado.nocheActual?.esfuerzoAsignado).toEqual([
        jugadorId('j-1'),
        jugadorId('j-2'),
      ]);
    }
  });

  test('Con 2 jugadores (sin Capataz) cada uno se ofrece a sí mismo y no puede asignar al otro', () => {
    let estado = estadoDecidirSinCapataz();

    // Nico se ofrece a sí mismo: ok.
    let r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-1'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.nocheActual?.esfuerzoAsignado).toEqual([jugadorId('j-1')]);

    // Nico no puede mandar a Vale.
    r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-1'), a: [jugadorId('j-2')] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');

    // Vale se ofrece a sí misma: se suma a la lista, no pisa la oferta de Nico.
    r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-2'), a: [jugadorId('j-2')] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.nocheActual?.esfuerzoAsignado).toContain(jugadorId('j-1'));
    expect(estado.nocheActual?.esfuerzoAsignado).toContain(jugadorId('j-2'));
    expect(estado.nocheActual?.esfuerzoAsignado?.length).toBe(2);
  });

  test('Si nadie asigna esfuerzo, decisionEsfuerzo queda vacío y el avance sale de AVANCE.base menos la dureza', () => {
    const tramoUnico = {
      id: tramoId('vado-bajo'),
      nombre: 'el vado bajo',
      dureza: 0,
      costoRecurso: 0,
      hallazgo: 0.1,
      pista: 'agua',
      terreno: '...',
    };
    let estado = estadoDecidirSinCapataz({
      nocheActual: {
        numero: 2,
        candidatos: [tramoUnico] as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
    });

    // Nadie manda asignar_esfuerzo. Ambos bloquean, sin Capataz eso alcanza
    // para resolver la noche.
    let r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-1') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-2') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    expect(estado.fase).toBe('resolver');
    expect(estado.esfuerzoNocheAnterior).toEqual([]);
    expect(estado.ultimaRevelacion?.esfuerzo).toEqual([]);
    // avance inicial 0 + max(0, AVANCE.base - dureza(0)) = AVANCE.base
    expect(estado.avance).toBe(AVANCE.base);
  });

  test('El atajo de "todos bloquearon" no le roba la ventana al Capataz', () => {
    let estado = estadoDecidirConCapataz();

    // Los tres que no son Capataz bloquean.
    for (const j of ['j-1', 'j-2', 'j-3']) {
      const r = reducir(estado, { t: 'bloquear', jugador: jugadorId(j) });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;
    }
    // Falta el Capataz: la noche NO se resuelve todavía, aunque los demás
    // hayan bloqueado, porque hay Capataz en la mesa y no repartió.
    expect(estado.fase).toBe('decidir');

    // El Capataz bloquea su propia boleta, pero tampoco repartió el esfuerzo.
    let r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-4') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('decidir');

    // Recién cuando el Capataz reparte (aunque sea lista vacía) se resuelve.
    r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-4'), a: [] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.fase).toBe('resolver');
  });

  test('proyectarTV() no expone revelacion en decidir ni acampar, y sí en fogon', () => {
    const revelacionFake: RevelacionBoletas = {
      noche: 1,
      ruta: [{ nombre: 'el vado bajo', votantes: ['Nico'], gano: true }],
      raciones: [{ nivel: 'normal', votantes: ['Nico'], gano: true }],
      esfuerzo: [],
      via: 'mayoria',
    };

    const base: EstadoPartida = {
      id: partidaId('partida-revelacion'),
      tablero: 'la-sierra' as any,
      semilla: 'test-revelacion',
      fase: 'decidir',
      noche: 1,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [],
      esfuerzoNocheAnterior: [],
      ultimaRevelacion: revelacionFake,
    };

    expect(proyectarTV(base).revelacion).toBeUndefined();
    expect(proyectarTV({ ...base, fase: 'acampar' }).revelacion).toBeUndefined();
    expect(proyectarTV({ ...base, fase: 'fogon' }).revelacion).toEqual(revelacionFake);
  });

  test('ultimaRevelacion sobrevive al pasaje a epilogo (la última noche también se revela)', () => {
    const tramoUnico = {
      id: tramoId('vado-bajo'),
      nombre: 'el vado bajo',
      dureza: 0,
      costoRecurso: 0,
      hallazgo: 0.1,
      pista: 'agua',
      terreno: '...',
    };
    let estado = estadoDecidirSinCapataz({
      noche: 5,
      nochesTotales: 5,
      nocheActual: {
        numero: 5,
        candidatos: [tramoUnico] as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
    });

    let r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-1') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    r = reducir(estado, { t: 'bloquear', jugador: jugadorId('j-2') });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    expect(estado.fase).toBe('resolver');
    expect(estado.ultimaRevelacion?.noche).toBe(5);

    // Se acaba la última noche: resolver -> epilogo, y nocheActual se borra.
    r = reducir(estado, { t: 'vencio_fase' });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    expect(estado.fase).toBe('epilogo');
    expect(estado.nocheActual).toBeUndefined();
    expect(estado.ultimaRevelacion?.noche).toBe(5);
  });

  /**
   * La noche 1 no reparte esfuerzo (D8). Si el motor igual esperara al Capataz
   * para el atajo de "todos bloquearon", la mesa bloquearía en veinte segundos
   * y se quedaría mirando el teléfono hasta que venza la ventana entera.
   */
  test('Noche 1: la mesa con Capataz resuelve por atajo sin esperar un reparto que no existe', () => {
    let estado = estadoDecidirConCapataz({
      noche: 1,
      nocheActual: {
        numero: 1,
        candidatos: tableroTest.tramos.slice(0, 2) as any,
        boletas: {},
        venceEn: Date.now() + 60000,
      },
    });

    for (const v of estado.viajeros) {
      const r = reducir(estado, { t: 'bloquear', jugador: v.id });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;
    }

    expect(estado.fase).toBe('resolver');
  });

  test('Noche 1: asignar_esfuerzo se rechaza — ninguna pantalla lo ofrece', () => {
    const estado = estadoDecidirConCapataz({
      noche: 1,
      nocheActual: {
        numero: 1,
        candidatos: tableroTest.tramos.slice(0, 2) as any,
        boletas: {},
        venceEn: Date.now() + 60000,
      },
    });
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-4'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('fuera_de_fase');
  });

  test('Noche 1: no se le ofrece repartir_esfuerzo a nadie, ni al Capataz', () => {
    const estado = estadoDecidirConCapataz({
      noche: 1,
      nocheActual: {
        numero: 1,
        candidatos: tableroTest.tramos.slice(0, 2) as any,
        boletas: {},
        venceEn: Date.now() + 60000,
      },
    });
    for (const v of estado.viajeros) {
      const vista = proyectarJugador(estado, v.id);
      expect(vista.acciones.some((a) => a.tipo === 'repartir_esfuerzo')).toBe(false);
    }
  });

  /**
   * `yaReparti` tiene que venir del servidor (D4): con estado local en el
   * celular se pierde al recargar y el Capataz vuelve a ver la pantalla de
   * reparto a mitad de la noche, pudiendo pisar lo que ya había decidido.
   */
  test('El servidor dice si ya se repartió: yaReparti y yaAsignado', () => {
    let estado = estadoDecidirConCapataz();
    const capataz = jugadorId('j-4');

    const antes: any = proyectarJugador(estado, capataz).acciones.find(
      (a) => a.tipo === 'repartir_esfuerzo',
    );
    expect(antes.yaReparti).toBe(false);
    expect(antes.yaAsignado).toEqual([]);

    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: capataz, a: [jugadorId('j-1')] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    const despues: any = proyectarJugador(estado, capataz).acciones.find(
      (a) => a.tipo === 'repartir_esfuerzo',
    );
    expect(despues.yaReparti).toBe(true);
    expect(despues.yaAsignado).toEqual([jugadorId('j-1')]);
  });

  test('El Capataz que reparte "a nadie" queda marcado como que ya repartió', () => {
    let estado = estadoDecidirConCapataz();
    const capataz = jugadorId('j-4');
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: capataz, a: [] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    const accion: any = proyectarJugador(estado, capataz).acciones.find(
      (a) => a.tipo === 'repartir_esfuerzo',
    );
    // Una lista vacía y "todavía no repartió" son estados distintos: sin este
    // registro, el celular no puede distinguirlos y vuelve a pedir el reparto.
    expect(accion.yaReparti).toBe(true);
    expect(accion.yaAsignado).toEqual([]);
  });

  test('Modo voluntario: que otro se haya ofrecido es secreto hasta el fogón', () => {
    let estado = estadoDecidirSinCapataz();
    const r = reducir(estado, { t: 'asignar_esfuerzo', jugador: jugadorId('j-1'), a: [jugadorId('j-1')] });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    const suyo: any = proyectarJugador(estado, jugadorId('j-1')).acciones.find(
      (a) => a.tipo === 'repartir_esfuerzo',
    );
    expect(suyo.yaReparti).toBe(true);
    expect(suyo.yaAsignado).toEqual([jugadorId('j-1')]);

    const ajeno: any = proyectarJugador(estado, jugadorId('j-2')).acciones.find(
      (a) => a.tipo === 'repartir_esfuerzo',
    );
    expect(ajeno.yaReparti).toBe(false);
    // No ve que j-1 se ofreció: sale de `esfuerzoAsignado`, que es tan secreto
    // como la boleta hasta que resuelve la noche (I7).
    expect(ajeno.yaAsignado).toEqual([]);
    expect(ajeno.max).toBe(1);
  });
});

/**
 * A2 (D10): el perro se puede perder. Antes de esto la rama que lo hacía era
 * código muerto (`decisionEsfuerzo.includes('perro')`, que nunca podía ser
 * cierto porque el perro nunca estaba entre las opciones de esfuerzo), así
 * que `presente` no podía valer `false` nunca.
 */
describe('A2 — El perro se puede perder', () => {
  function estadoDecidirConCapataz(overrides: Partial<EstadoPartida> = {}): EstadoPartida {
    return {
      id: partidaId('partida-perro'),
      tablero: 'la-sierra' as any,
      semilla: 'test-perro',
      fase: 'decidir',
      noche: 3,
      nochesTotales: 5,
      avance: 0,
      distanciaTotal: 24,
      recurso: 30,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 3, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-3'), nombre: 'Seba', rol: 'despensero', asiento: 2, vigor: 3, objetivo: 'sobre-raciones' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-4'), nombre: 'Cami', rol: 'capataz', asiento: 3, vigor: 3, objetivo: 'ver-el-final' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      nocheActual: {
        numero: 3,
        candidatos: tableroTest.tramos as any,
        boletas: {},
        venceEn: Date.now() + 20000,
      },
      cronica: [],
      esfuerzoNocheAnterior: [],
      ...overrides,
    };
  }

  const capataz = jugadorId('j-4');
  const noCapataz = jugadorId('j-1');

  test('Un no-Capataz no puede mandar al perro a explorar', () => {
    const estado = estadoDecidirConCapataz();
    const r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: noCapataz, manda: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('No se puede mandar antes de la noche 3, aunque lo pida el Capataz', () => {
    const estado = estadoDecidirConCapataz({ noche: 2 });
    const r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('No se puede mandar a explorar a un perro que ya no está', () => {
    const estado = estadoDecidirConCapataz({
      perro: { presente: false, alerta: 'ninguna', dice_la_verdad: true },
    });
    const r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  test('No se puede mandar dos veces la misma noche', () => {
    let estado = estadoDecidirConCapataz();
    let r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;
    expect(estado.nocheActual?.perroExplorando).toBe(true);

    r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('jugada_invalida');
  });

  /**
   * "Que se quede" es una respuesta, no un silencio. Si el servidor no la
   * registrara, el celular tendría que acordarse en estado local y la pantalla
   * volvería al recargar el teléfono a mitad de la noche (D4).
   */
  test('Decir "que se quede" queda registrado y apaga la pantalla', () => {
    let estado = estadoDecidirConCapataz();

    const antes: any = proyectarJugador(estado, capataz).acciones.find(
      (a) => a.tipo === 'mandar_perro',
    );
    expect(antes.yaDecidio).toBe(false);

    const r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: false });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Decidido pero NO explorando: son dos cosas distintas y por eso hacen
    // falta dos campos.
    expect(estado.nocheActual?.perroDecidido).toBe(true);
    expect(estado.nocheActual?.perroExplorando).toBeUndefined();
    expect(estado.perro.presente).toBe(true);

    const despues: any = proyectarJugador(estado, capataz).acciones.find(
      (a) => a.tipo === 'mandar_perro',
    );
    expect(despues.yaDecidio).toBe(true);
    expect(despues.yaMandado).toBe(false);
  });

  test('Después de decir que no, no se puede cambiar de idea esa noche', () => {
    let estado = estadoDecidirConCapataz();
    let r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: false });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
    expect(r.ok).toBe(false);
  });

  test('Con la semilla adecuada, mandarlo a explorar lo pierde: presente pasa a false', () => {
    // El riesgo es de 25%: se prueban semillas hasta encontrar una donde
    // salga, en vez de hardcodear un número mágico que se rompe si cambia el
    // orden interno de consumos del Rng.
    let encontrado = false;
    for (let i = 0; i < 300 && !encontrado; i++) {
      let estado = estadoDecidirConCapataz({ semilla: `test-perro-explora-${i}` });
      let r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;

      r = reducir(estado, { t: 'vencio_fase' });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;
      expect(estado.fase).toBe('resolver');

      if (estado.perro.presente === false) {
        encontrado = true;
        expect(estado.cronica[estado.cronica.length - 1]?.hechos).toContain('perro_perdido');
      }
    }
    expect(encontrado).toBe(true);
  });

  test('Si vuelve de explorar, la crónica lo registra y no lo pierde', () => {
    let encontrado = false;
    for (let i = 0; i < 300 && !encontrado; i++) {
      let estado = estadoDecidirConCapataz({ semilla: `test-perro-vuelve-${i}` });
      let r = reducir(estado, { t: 'mandar_perro_a_explorar', jugador: capataz, manda: true });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;

      r = reducir(estado, { t: 'vencio_fase' });
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.transicion.estado;

      if (estado.perro.presente === true) {
        encontrado = true;
        expect(estado.cronica[estado.cronica.length - 1]?.hechos).toContain('perro_exploro');
      }
    }
    expect(encontrado).toBe(true);
  });

  test('Después de explorar y volver, la noche siguiente la alerta no miente y se revela el tramo más duro', () => {
    // Estado justo antes de la transición fogon → acampar: el perro exploró
    // anoche (perroExplorando en la noche que se está cerrando) y sobrevivió
    // (perro.presente sigue true).
    const estado = estadoDecidirConCapataz({
      fase: 'fogon',
      noche: 3,
      nocheActual: {
        numero: 3,
        candidatos: tableroTest.tramos as any,
        boletas: {},
        perroExplorando: true,
        venceEn: Date.now(),
      },
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      cronica: [{ noche: 3, hechos: ['perro_exploro'], relato: '...', origen: 'respaldo' }],
    });

    const r = reducir(estado, { t: 'vencio_fase' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.transicion.estado.fase).toBe('acampar');
    expect(r.transicion.estado.noche).toBe(4);
    // Forzado a true: se saltea el sorteo de PERRO_MIENTE por completo.
    expect(r.transicion.estado.perro.dice_la_verdad).toBe(true);

    const candidatosNuevos = r.transicion.estado.nocheActual!.candidatos;
    const masDuro = candidatosNuevos.reduce(
      (m, c) => (c.dureza > m.dureza ? c : m),
      candidatosNuevos[0]!,
    );
    expect(r.transicion.estado.perro.tramoRevelado).toBe(masDuro.nombre);
  });

  test('Sin haber explorado, tramoRevelado no aparece y la mentira sigue siendo posible', () => {
    const estado = estadoDecidirConCapataz({
      fase: 'fogon',
      noche: 3,
      nocheActual: {
        numero: 3,
        candidatos: tableroTest.tramos as any,
        boletas: {},
        venceEn: Date.now(),
      },
      cronica: [{ noche: 3, hechos: ['tramo:x'], relato: '...', origen: 'respaldo' }],
    });

    const r = reducir(estado, { t: 'vencio_fase' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.transicion.estado.perro.tramoRevelado).toBeUndefined();
  });
});

/**
 * A3: el pago del epílogo —objetivo propio, cumplido o no— también en el
 * celular, no solo en la TV. Antes de esto el celular repetía el mismo "no
 * te toca ninguna acción" genérico que usó toda la partida.
 */
describe('A3 — El celular revela lo tuyo', () => {
  function estadoEpilogo(): EstadoPartida {
    return {
      id: partidaId('partida-epilogo'),
      tablero: 'la-sierra' as any,
      semilla: 'test-epilogo',
      fase: 'epilogo',
      noche: 5,
      nochesTotales: 5,
      avance: 24,
      distanciaTotal: 24,
      recurso: 10,
      capacidad: 40,
      viajeros: [
        { id: jugadorId('j-1'), nombre: 'Nico', rol: 'baqueano', asiento: 0, vigor: 3, objetivo: 'llegar-entero' as any, conectado: true, cegado: false, aceptoElTrato: false },
        { id: jugadorId('j-2'), nombre: 'Vale', rol: 'curandera', asiento: 1, vigor: 0, objetivo: 'que-nadie-quede' as any, conectado: true, cegado: false, aceptoElTrato: false },
      ],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [],
      esfuerzoNocheAnterior: [],
      desenlace: {
        llegaron: true,
        // Nico cumplió su objetivo ('llegar-entero': vigor > 0). Vale, con
        // vigor 0, no cumplió el suyo ('que-nadie-quede').
        objetivosCumplidos: [jugadorId('j-1')],
        perroLlego: true,
      },
    };
  }

  test('miDesenlace trae el objetivo propio, cumplido o no', () => {
    const estado = estadoEpilogo();

    const vistaNico = proyectarJugador(estado, jugadorId('j-1'));
    expect(vistaNico.miDesenlace).toEqual({
      objetivo: 'Llegar sin haberte quebrado nunca.',
      cumplido: true,
      llegaron: true,
    });

    const vistaVale = proyectarJugador(estado, jugadorId('j-2'));
    expect(vistaVale.miDesenlace).toEqual({
      objetivo: 'Que ningún viajero termine quebrado.',
      cumplido: false,
      llegaron: true,
    });
  });

  test('miDesenlace no filtra el objetivo de los demás', () => {
    const estado = estadoEpilogo();

    const vistaNico = proyectarJugador(estado, jugadorId('j-1'));
    const jsonNico = JSON.stringify(vistaNico);
    expect(jsonNico).not.toContain('que-nadie-quede');
    expect(jsonNico).not.toContain('Que ningún viajero termine quebrado');

    const vistaVale = proyectarJugador(estado, jugadorId('j-2'));
    const jsonVale = JSON.stringify(vistaVale);
    expect(jsonVale).not.toContain('llegar-entero');
    expect(jsonVale).not.toContain('Llegar sin haberte quebrado nunca');
  });

  test('Fuera del epílogo, miDesenlace no viene', () => {
    // `exactOptionalPropertyTypes` no deja asignar `desenlace: undefined`
    // directo: hay que omitir la propiedad entera, no vaciarla.
    const { desenlace, ...sinDesenlace } = estadoEpilogo();
    const estado: EstadoPartida = { ...sinDesenlace, fase: 'fogon' };
    expect(proyectarJugador(estado, jugadorId('j-1')).miDesenlace).toBeUndefined();
  });
});

/**
 * Un cliente con el JS viejo en memoria durante un deploy reconecta el socket
 * y queda mudo sin ningún error visible. Esto es lo que lo convierte en una
 * recarga automática, y en un cartel si la recarga no alcanzó.
 */
describe('Versión de protocolo', () => {
  test('Misma versión: sigue', () => {
    expect(decidirPorVersion(VERSION_PROTOCOLO, false)).toBe('seguir');
    expect(decidirPorVersion(VERSION_PROTOCOLO, true)).toBe('seguir');
  });

  test('Versión distinta y todavía no se recargó: se recarga', () => {
    expect(decidirPorVersion(VERSION_PROTOCOLO + 1, false)).toBe('recargar');
    expect(decidirPorVersion(VERSION_PROTOCOLO - 1, false)).toBe('recargar');
  });

  test('Versión distinta después de recargarse: se rinde y avisa, no entra en loop', () => {
    expect(decidirPorVersion(VERSION_PROTOCOLO + 1, true)).toBe('rendirse');
  });
});

/**
 * El trato (D9, C3): una vez por travesía, o ninguna. La noche se sortea al
 * `empezar` con la config, no con probabilidades hardcodeadas por noche.
 * Antes de C3 el motor tiraba 0.25/0.33/0.5 en cada transición y
 * `TRATO.probabilidadDeNoOfrecer` no la leía nadie.
 */
describe('El trato sale de la config, una vez por travesía', () => {
  function partidaEmpezada(semilla: string): EstadoPartida {
    let estado = { id: partidaId('p-trato') } as EstadoPartida;
    const paso = (c: Comando) => {
      const r = reducir(estado, c);
      if (!r.ok) throw new Error(`rechazado: ${c.t}`);
      estado = r.transicion.estado;
    };
    paso({ t: 'crear', tablero: 'la-sierra' as any, semilla });
    for (let i = 0; i < 5; i++) {
      paso({ t: 'sumar_jugador', jugador: jugadorId(`t${i}`), nombre: `T${i}` });
      paso({ t: 'marcar_listo', jugador: jugadorId(`t${i}`), listo: true });
    }
    paso({ t: 'empezar' });
    return estado;
  }

  test('Si se ofrece, la noche cae dentro de la ventana de TRATO', () => {
    for (let i = 0; i < 60; i++) {
      const e = partidaEmpezada(`sem-trato-${i}`);
      if (e.nocheTrato !== undefined) {
        expect(e.nocheTrato).toBeGreaterThanOrEqual(TRATO.nocheMin);
        expect(e.nocheTrato).toBeLessThanOrEqual(TRATO.nocheMax);
      }
    }
  });

  test('Que "a nadie" sea posible: hay travesías sin trato y travesías con', () => {
    // Que "ninguno" sea posible es lo que hace que la sospecha salga gratis
    // (D9). Si esto fallara en un solo sentido, el trato pasó a ser seguro o
    // imposible, que son las dos formas de romper esa decisión.
    let sin = 0;
    let con = 0;
    for (let i = 0; i < 120; i++) {
      if (partidaEmpezada(`sem-reparto-${i}`).nocheTrato === undefined) sin++;
      else con++;
    }
    expect(sin).toBeGreaterThan(0);
    expect(con).toBeGreaterThan(0);
  });

  test('Misma semilla, misma noche de trato: sale del Rng, no de Math.random', () => {
    const a = partidaEmpezada('sem-determinista');
    const b = partidaEmpezada('sem-determinista');
    expect(a.nocheTrato).toBe(b.nocheTrato);
  });

  test('nocheTrato no se filtra a ningún cliente', () => {
    const e = partidaEmpezada('sem-fuga');
    const tv = JSON.stringify(proyectarTV(e));
    const jug = JSON.stringify(proyectarJugador(e, e.viajeros[0]!.id));
    expect(tv).not.toContain('nocheTrato');
    expect(jug).not.toContain('nocheTrato');
  });
});
