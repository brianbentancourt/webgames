import { describe, test, expect, beforeAll } from 'vitest';
import { reducir, registrarTablero, obtenerTablero } from './maquina.js';
import { proyectarTV, proyectarJugador } from './vistas.js';
import type { EstadoPartida, Comando } from './index.js';
import { jugadorId, partidaId, tramoId } from './ids.js';

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
      esfuerzo: [jugadorId('j-1')],
    });
    expect(r.ok).toBe(true);
    if (r.ok) estado = r.transicion.estado;

    // Vale vota vado bajo
    r = reducir(estado, {
      t: 'elegir',
      jugador: jugadorId('j-2'),
      ruta: tramoId('vado-bajo'),
      raciones: 'abundante',
      esfuerzo: [],
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
          'j-1': { ruta: tramoId('cuesta-del-viento'), raciones: 'normal', esfuerzo: [], bloqueadaEn: Date.now() },
        } as any,
        venceEn: Date.now() + 20000,
      },
      cronica: [],
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
