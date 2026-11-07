/**
 * ¿La partida tiene buena forma?
 *
 * Vive acá y no en `@salvese/core` porque es el único lugar del repo donde se
 * juntan el motor y los tableros de verdad.
 *
 * Lección de D22: durante meses todos los tests pasaron en verde con un juego
 * imposible de ganar, porque ninguno miraba una partida entera. Este archivo
 * juega miles de noches con mesas simuladas y mira la **forma** del resultado:
 *
 *  - que te agarren a veces, pero no siempre (si nunca pasa no hay miedo; si
 *    pasa siempre, volverse al toque es la única jugada);
 *  - que las noches tengan largo de noche, no de trámite;
 *  - que no gane siempre la misma estrategia;
 *  - que la partida entre en el tiempo de un party game.
 */

import { describe, test, expect } from 'vitest';
import { reducir, jugadorId, TIEMPOS, type EstadoPartida, type Resultado } from '@salvese/core';
import { TABLEROS, validarTableros } from '@salvese/tableros';

function ok(r: Resultado): EstadoPartida {
  if (!r.ok) throw new Error(`rechazado: ${r.motivo}`);
  return r.estado;
}

/**
 * Lo que una mesa puede calcular mirando la TV: qué peligros ya salieron, cuántas
 * copias de cada uno quedan y cuánta plata falta salir. El orden del mazo no lo
 * mira: solo la composición, que es pública.
 */
function riesgo(e: EstadoPartida) {
  const vistos = new Set(e.camino.flatMap((c) => (c.carta.t === 'peligro' ? [c.carta.tipo] : [])));
  const letales = e.mazo.filter((c) => c.t === 'peligro' && vistos.has(c.tipo)).length;
  const plata = e.mazo.reduce((s, c) => s + (c.t === 'hallazgo' ? c.valor : 0), 0);
  const quedan = Math.max(1, e.mazo.length);
  return { pLetal: letales / quedan, plataPorCarta: plata / quedan };
}

/**
 * Una mesa de bots que comparan lo que arriesgan contra lo que esperan ganar.
 * `audacia` multiplica la ganancia esperada: 0,6 es un cagón, 4 un loco. Le
 * hacen caso al perro, y lo tirado en el camino los tienta a volver.
 */
function jugar(tableroId: string, semilla: string, audacia: number[]) {
  const tablero = TABLEROS.find((t) => t.id === tableroId)!;
  const ids = audacia.map((_, i) => jugadorId(`j${i}`));
  let s = 17;
  for (const ch of semilla) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

  let e = ok(reducir(null, { t: 'empezar', tablero, semilla, jugadores: ids.map((id) => ({ id, nombre: id })) }));
  let segundos = 0;
  let atrapados = 0;
  let vueltas = 0;
  while (e.fase !== 'final' && vueltas++ < 5000) {
    if (e.fase === 'decidir') {
      segundos += 6; // lo que tarda una mesa real en tocar, en promedio
      const { pLetal, plataPorCarta } = riesgo(e);
      const presentes = e.jugadores.filter((j) => j.lugar === 'camino').length;
      const tirado = e.camino.reduce((a, c) => a + c.resto, 0);
      const olfato = e.perro === 'grune' ? 2.5 : e.perro === 'inquieto' ? 1.2 : 0.6;
      for (const [i, id] of ids.entries()) {
        const j = e.jugadores.find((x) => x.id === id)!;
        if (j.lugar !== 'camino' || j.eleccion !== null) continue;
        const pierde = Math.min(1, pLetal * olfato) * j.mochila;
        const gana = (plataPorCarta / presentes) * (1 - pLetal) * audacia[i]! * (0.7 + rnd() * 0.6);
        const opcion = pierde + tirado / presentes > gana ? 'vuelvo' : 'sigo';
        e = ok(reducir(e, { t: 'elegir', jugador: id, opcion }));
        if (e.fase !== 'decidir') break;
      }
      continue;
    }
    if (e.fase === 'emboscada') atrapados += e.emboscada!.perdieron.length;
    segundos +=
      {
        presentacion: TIEMPOS.presentacionMs,
        revelar: TIEMPOS.hallazgoMs,
        retirada: TIEMPOS.retiradaMs,
        emboscada: TIEMPOS.emboscadaMs,
        fin_noche: TIEMPOS.finNocheMs,
        decidir: 0,
        final: 0,
      }[e.fase] / 1000;
    e = ok(reducir(e, { t: 'vencio_fase' }));
  }
  return { e, minutos: segundos / 60, atrapados };
}

test('los tableros son válidos', () => {
  expect(() => validarTableros()).not.toThrow();
});

for (const tablero of TABLEROS) {
  describe(tablero.nombre, () => {
    // Cinco jugadores: un cagón, tres de los otros y un loco.
    const mesa = [0.6, 1, 1.5, 2.5, 4];
    const partidas = Array.from({ length: 400 }, (_, i) => jugar(tablero.id, `${tablero.id}-${i}`, mesa));
    const noches = partidas.flatMap((p) => p.e.historial);

    test('termina siempre', () => {
      expect(partidas.every((p) => p.e.fase === 'final')).toBe(true);
    });

    test('te agarran a veces, no siempre', () => {
      // Por jugador y por noche. Con una de cada diez no hay miedo; con más de
      // la mitad, volverse al toque es la única jugada.
      const atrapados = partidas.reduce((s, p) => s + p.atrapados, 0);
      const jugadorNoches = noches.length * mesa.length;
      expect(atrapados / jugadorNoches).toBeGreaterThan(0.15);
      expect(atrapados / jugadorNoches).toBeLessThan(0.55);
    });

    test('una noche tiene largo de noche', () => {
      const tramos = noches.reduce((s, n) => s + n.tramos, 0) / noches.length;
      expect(tramos).toBeGreaterThan(4);
      expect(tramos).toBeLessThan(12);
    });

    test('no gana siempre la misma estrategia', () => {
      const ganadas = new Map<string, number>();
      for (const p of partidas) {
        const max = Math.max(...p.e.jugadores.map((j) => j.baul));
        for (const j of p.e.jugadores) if (j.baul === max) ganadas.set(j.id, (ganadas.get(j.id) ?? 0) + 1);
      }
      // Arriesgar paga más, que es el punto, pero ninguna estrategia se lleva
      // más de la mitad y por lo menos tres de cinco ganan una de cada veinte.
      expect(Math.max(...ganadas.values()) / partidas.length).toBeLessThan(0.55);
      expect([...ganadas.values()].filter((n) => n / partidas.length >= 0.05).length).toBeGreaterThanOrEqual(3);
    });

    test('entra en el tiempo de un party game', () => {
      const minutos = partidas.reduce((s, p) => s + p.minutos, 0) / partidas.length;
      expect(minutos).toBeGreaterThan(6);
      expect(minutos).toBeLessThan(20);
    });
  });
}
