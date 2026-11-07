import { describe, expect, test } from 'vitest';
import { armarMazo, olfatear, reducir, type Comando, type Resultado } from './maquina.js';
import type { Carta, EstadoPartida, TableroDato } from './estado.js';
import { jugadorId, type JugadorId } from './ids.js';
import { proyectarJugador, proyectarTV } from './vistas.js';
import { premios, ranking } from './premios.js';

const tablero: TableroDato = {
  id: 'prueba',
  nombre: 'Prueba',
  regla: 'datos de mentira',
  noches: 3,
  tesoro: 'plata',
  paleta: { cielo: '#000', cerroLejano: '#111', cerroMedio: '#222', cerroCercano: '#333', brasa: '#f70' },
  fondos: { camino: 'a', campamento: 'b', final: 'c' },
  hallazgos: [1, 2, 3, 5, 7, 9, 11].map((valor) => ({ valor, nombre: `veta de ${valor}` })),
  peligros: ['puma', 'derrumbe', 'crecida'].map((tipo) => ({
    tipo,
    nombre: `el ${tipo}`,
    icono: '!',
    susto: `aparece ${tipo}`,
    golpe: `otra vez ${tipo}`,
  })),
  copiasPorPeligro: 3,
};

const ana = jugadorId('ana');
const beto = jugadorId('beto');
const caro = jugadorId('caro');

const h = (valor: number): Carta => ({ id: `h-${valor}-${Math.random()}`, t: 'hallazgo', valor, nombre: `veta de ${valor}` });
const p = (tipo: string): Carta => ({ id: `${tipo}-${Math.random()}`, t: 'peligro', tipo });

function ok(r: Resultado): EstadoPartida {
  if (!r.ok) throw new Error(`rechazado: ${r.motivo}`);
  return r.estado;
}

/** Una partida de tres con el mazo de la primera noche fijado a mano. */
function mesa(mazo: Carta[], jugadores: JugadorId[] = [ana, beto, caro]): EstadoPartida {
  const e = ok(
    reducir(null, {
      t: 'empezar',
      tablero,
      semilla: 'test',
      jugadores: jugadores.map((id) => ({ id, nombre: id })),
    }),
  );
  return { ...e, mazo };
}

const vence = (e: EstadoPartida) => ok(reducir(e, { t: 'vencio_fase' }));
const elige = (e: EstadoPartida, jugador: JugadorId, opcion: 'sigo' | 'vuelvo') =>
  ok(reducir(e, { t: 'elegir', jugador, opcion }));
const jugador = (e: EstadoPartida, id: JugadorId) => e.jugadores.find((j) => j.id === id)!;

describe('arranque', () => {
  test('empieza presentando la noche 1 con todos en el camino', () => {
    const e = mesa([]);
    expect(e.fase).toBe('presentacion');
    expect(e.noche).toBe(1);
    expect(e.jugadores.every((j) => j.lugar === 'camino' && j.mochila === 0 && j.baul === 0)).toBe(true);
  });

  test('no arranca con menos de dos', () => {
    const r = reducir(null, { t: 'empezar', tablero, semilla: 's', jugadores: [{ id: ana, nombre: 'ana' }] });
    expect(r.ok).toBe(false);
  });

  test('el mazo tiene todos los hallazgos y todas las copias de cada peligro', () => {
    const e = mesa([]);
    const mazo = armarMazo(e, 1);
    expect(mazo.filter((c) => c.t === 'hallazgo')).toHaveLength(7);
    expect(mazo.filter((c) => c.t === 'peligro')).toHaveLength(9);
  });

  test('misma semilla, mismo mazo; otra noche, otro orden', () => {
    const e = mesa([]);
    expect(armarMazo(e, 1)).toEqual(armarMazo(e, 1));
    expect(armarMazo(e, 1).map((c) => c.id)).not.toEqual(armarMazo(e, 2).map((c) => c.id));
  });

  test('pide reloj y publica', () => {
    const r = reducir(null, { t: 'empezar', tablero, semilla: 's', jugadores: [{ id: ana, nombre: 'a' }, { id: beto, nombre: 'b' }] });
    expect(r.ok && r.efectos.map((f) => f.t)).toEqual(['agendar', 'publicar']);
  });
});

describe('hallazgos', () => {
  test('se reparte parejo entre los que están y el resto queda tirado', () => {
    const e = vence(mesa([h(11), p('puma')]));
    expect(e.fase).toBe('revelar');
    expect(e.jugadores.map((j) => j.mochila)).toEqual([3, 3, 3]);
    expect(e.camino[0]!.resto).toBe(2);
  });

  test('después del hallazgo se abre la decisión, con el perro opinando', () => {
    const e = vence(vence(mesa([h(9), p('puma')])));
    expect(e.fase).toBe('decidir');
    expect(e.perro).not.toBeNull();
  });
});

describe('sigo o me vuelvo', () => {
  test('cuando eligen todos, se resuelve sin esperar al reloj', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    e = elige(e, ana, 'sigo');
    expect(e.fase).toBe('decidir');
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'vuelvo');
    expect(e.fase).toBe('retirada');
  });

  test('elegir publica pero no reinicia el reloj', () => {
    const e = vence(vence(mesa([h(9), h(3)])));
    const r = reducir(e, { t: 'elegir', jugador: ana, opcion: 'sigo' });
    expect(r.ok && r.efectos.map((f) => f.t)).toEqual(['publicar']);
    expect(r.ok && r.estado.paso).toBe(e.paso);
  });

  test('un toque y queda: no se puede cambiar', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    e = elige(e, ana, 'sigo');
    const r = reducir(e, { t: 'elegir', jugador: ana, opcion: 'vuelvo' });
    expect(r.ok).toBe(false);
  });

  test('fuera de la decisión no se elige', () => {
    const e = mesa([h(9)]);
    expect(reducir(e, { t: 'elegir', jugador: ana, opcion: 'sigo' }).ok).toBe(false);
  });

  test('el que vuelve guarda la mochila; los que siguen no tocan lo tirado', () => {
    // 11 entre 3: 3 cada uno y quedan 2 tirados.
    let e = vence(vence(mesa([h(11), h(5)])));
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'vuelvo');
    e = elige(e, caro, 'sigo');
    // 2 tirados entre 2 que vuelven: 1 cada uno.
    expect(jugador(e, ana)).toMatchObject({ lugar: 'campamento', baul: 4, mochila: 0 });
    expect(jugador(e, beto)).toMatchObject({ lugar: 'campamento', baul: 4 });
    expect(jugador(e, caro)).toMatchObject({ lugar: 'camino', mochila: 3, baul: 0 });
    expect(e.retirada!.cadaUno).toBe(1);
  });

  test('el que vuelve solo se lleva todo lo tirado', () => {
    let e = vence(vence(mesa([h(11), h(5)])));
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    expect(jugador(e, ana).baul).toBe(3 + 2);
    expect(jugador(e, ana).stats.volvioSolo).toBe(1);
    expect(e.camino.every((c) => c.resto === 0)).toBe(true);
  });

  test('lo que no se puede repartir entre los que vuelven sigue tirado', () => {
    // 11 entre 3: 2 tirados. Vuelven tres: 0 cada uno, quedan 2.
    let e = vence(vence(mesa([h(11), h(5)])));
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'vuelvo');
    e = elige(e, caro, 'vuelvo');
    expect(e.retirada!.cadaUno).toBe(0);
    expect(e.camino.reduce((s, c) => s + c.resto, 0)).toBe(2);
  });

  test('el que no elige a tiempo sigue, y la retirada lo dice', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    e = elige(e, ana, 'vuelvo');
    e = vence(e);
    expect(e.fase).toBe('retirada');
    expect(e.retirada!.callados).toEqual([beto, caro]);
    expect(jugador(e, beto)).toMatchObject({ lugar: 'camino', eleccion: 'sigo' });
  });

  test('si quedan en el camino se da vuelta el próximo tramo, solo para ellos', () => {
    let e = vence(vence(mesa([h(9), h(4)])));
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    e = vence(e);
    expect(e.fase).toBe('revelar');
    expect(jugador(e, beto).mochila).toBe(3 + 2);
    expect(jugador(e, ana).mochila).toBe(0);
  });

  test('si vuelven todos, termina la noche', () => {
    let e = vence(vence(mesa([h(9), h(4)])));
    for (const id of [ana, beto, caro]) e = elige(e, id, 'vuelvo');
    e = vence(e);
    expect(e.fase).toBe('fin_noche');
    expect(e.historial[0]!.motivo).toBe('todos_volvieron');
  });
});

describe('peligros', () => {
  test('el primero es un susto: no pasa nada y se decide', () => {
    let e = vence(mesa([h(9), p('puma'), p('derrumbe')]));
    e = vence(e); // decidir
    for (const id of [ana, beto, caro]) e = elige(e, id, 'sigo');
    e = vence(e); // revela el puma
    expect(e.fase).toBe('revelar');
    expect(e.jugadores.every((j) => j.mochila === 3)).toBe(true);
  });

  test('el segundo igual se lleva lo que cargan los que siguen', () => {
    let e = vence(mesa([h(9), p('puma'), p('puma')]));
    e = vence(e);
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    e = vence(e); // primer puma
    e = vence(e); // decidir
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    e = vence(e); // segundo puma
    expect(e.fase).toBe('emboscada');
    expect(jugador(e, ana)).toMatchObject({ lugar: 'campamento', baul: 3 });
    expect(jugador(e, beto)).toMatchObject({ lugar: 'atrapado', mochila: 0, perdidoNoche: 3 });
    expect(e.emboscada!.perdieron).toEqual([
      { jugador: beto, cuanto: 3 },
      { jugador: caro, cuanto: 3 },
    ]);
    expect(e.quitados['puma']).toBe(1);
  });

  test('la copia que embosca sale del mazo de las noches siguientes', () => {
    let e = vence(mesa([p('puma'), p('puma')]));
    e = vence(e);
    for (const id of [ana, beto, caro]) e = elige(e, id, 'sigo');
    e = vence(e);
    expect(e.fase).toBe('emboscada');
    e = vence(vence(e)); // fin_noche → noche 2
    expect(e.noche).toBe(2);
    expect(e.mazo.filter((c) => c.t === 'peligro' && c.tipo === 'puma')).toHaveLength(2);
  });

  test('dos peligros distintos no hacen nada', () => {
    let e = vence(mesa([p('puma'), p('derrumbe'), h(3)]));
    e = vence(e);
    for (const id of [ana, beto, caro]) e = elige(e, id, 'sigo');
    e = vence(e);
    expect(e.fase).toBe('revelar');
  });
});

describe('el perro', () => {
  test('ante lo letal gruñe casi siempre; ante plata casi nunca', () => {
    let grunioLetal = 0;
    let grunioPlata = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const base = { ...mesa([]), semilla: `perro-${i}`, camino: [{ carta: p('puma'), resto: 0 }] };
      if (olfatear({ ...base, mazo: [p('puma')] }) === 'grune') grunioLetal++;
      if (olfatear({ ...base, mazo: [h(5)] }) === 'grune') grunioPlata++;
    }
    expect(grunioLetal / n).toBeGreaterThan(0.6);
    expect(grunioLetal / n).toBeLessThan(0.9);
    expect(grunioPlata / n).toBeLessThan(0.2);
  });
});

/** Juega la partida entera con un criterio fijo: vuelve cuando carga `umbral` o más. */
function partidaEntera(semilla: string, umbrales: number[]) {
  const ids = umbrales.map((_, i) => jugadorId(`j${i}`));
  let r = reducir(null, { t: 'empezar', tablero, semilla, jugadores: ids.map((id) => ({ id, nombre: id })) });
  let e = ok(r);
  let vueltas = 0;
  while (e.fase !== 'final' && vueltas++ < 2000) {
    if (e.fase === 'decidir') {
      for (const [i, id] of ids.entries()) {
        const j = jugador(e, id);
        if (j.lugar !== 'camino' || j.eleccion !== null) continue;
        const c: Comando = { t: 'elegir', jugador: id, opcion: j.mochila >= umbrales[i]! ? 'vuelvo' : 'sigo' };
        r = reducir(e, c);
        e = ok(r);
        if (e.fase !== 'decidir') break;
      }
      continue;
    }
    e = vence(e);
  }
  return e;
}

describe('partida entera', () => {
  test('termina en el final después de todas las noches', () => {
    const e = partidaEntera('entera', [4, 8, 99]);
    expect(e.fase).toBe('final');
    expect(e.historial).toHaveLength(tablero.noches);
  });

  test('nada de plata se crea ni se pierde fuera de las emboscadas', () => {
    for (let i = 0; i < 30; i++) {
      const e = partidaEntera(`cuentas-${i}`, [3, 6, 10]);
      const guardado = e.jugadores.reduce((s, j) => s + j.baul, 0);
      const perdido = e.jugadores.reduce((s, j) => s + j.stats.perdidoTotal, 0);
      const salio = e.historial.reduce((s, n) => s + n.filas.reduce((a, f) => a + f.ganado, 0), 0);
      expect(guardado).toBe(salio);
      expect(guardado).toBeGreaterThanOrEqual(0);
      expect(perdido).toBeGreaterThanOrEqual(0);
    }
  });

  test('el ranking ordena por baúl y comparte puesto en empate', () => {
    const e = partidaEntera('ranking', [4, 8, 99]);
    const r = ranking(e);
    expect(r.map((x) => x.baul)).toEqual([...r.map((x) => x.baul)].sort((a, b) => b - a));
    const empate = ranking({ ...e, jugadores: e.jugadores.map((j) => ({ ...j, baul: 5 })) });
    expect(empate.every((x) => x.puesto === 1)).toBe(true);
  });

  test('el temerario que nunca vuelve se gana su premio', () => {
    // Uno que no vuelve nunca, contra dos prudentes: en tres noches algo lo agarra.
    let alguno = false;
    for (let i = 0; i < 20 && !alguno; i++) {
      const e = partidaEntera(`temerario-${i}`, [3, 3, 999]);
      alguno = premios(e).some((p) => p.titulo === 'El temerario' && p.jugadores.includes(jugadorId('j2')));
    }
    expect(alguno).toBe(true);
  });

  test('los empates en la punta comparten premio; si empata toda la mesa, no hay', () => {
    const e = partidaEntera('empates', [4, 8, 99]);
    const conStats = (atrapado: number[]) => ({
      ...e,
      jugadores: e.jugadores.map((j, i) => ({
        ...j,
        stats: { ...j.stats, vecesAtrapado: atrapado[i]!, perdidoMax: 0, volvioSolo: 0, primeroEnVolver: 0, ultimoEnVolver: 0 },
      })),
    });
    const compartido = premios(conStats([1, 3, 3])).find((p) => p.titulo === 'El temerario')!;
    expect(compartido.jugadores).toEqual([jugadorId('j1'), jugadorId('j2')]);
    expect(compartido.nombre).toBe('j1 y j2');
    expect(premios(conStats([2, 2, 2])).find((p) => p.titulo === 'El temerario')).toBeUndefined();
  });

  test('la revancha arranca de cero con la misma mesa y otro mazo', () => {
    const e = partidaEntera('revancha', [4, 8, 99]);
    const nueva = ok(reducir(e, { t: 'revancha', jugador: jugadorId('j0') }));
    expect(nueva.fase).toBe('presentacion');
    expect(nueva.noche).toBe(1);
    expect(nueva.ronda).toBe(1);
    expect(nueva.jugadores.every((j) => j.baul === 0 && j.stats.vecesAtrapado === 0)).toBe(true);
    expect(nueva.paso).toBeGreaterThan(e.paso);
    expect(nueva.mazo.map((c) => c.id)).not.toEqual(armarMazo({ ...e, ronda: 0 }, 1).map((c) => c.id));
  });

  test('en la revancha entran los que llegaron tarde', () => {
    const e = partidaEntera('tarde', [4, 8]);
    const mesa = [...e.jugadores.map((j) => ({ id: j.id, nombre: j.nombre })), { id: jugadorId('nuevo'), nombre: 'nuevo' }];
    const nueva = ok(reducir(e, { t: 'revancha', jugador: jugadorId('j0'), jugadores: mesa }));
    expect(nueva.jugadores.map((j) => j.id)).toContain(jugadorId('nuevo'));
  });

  test('no hay revancha antes del final', () => {
    expect(reducir(mesa([]), { t: 'revancha', jugador: ana }).ok).toBe(false);
  });
});

describe('vistas', () => {
  test('la TV no muestra lo que eligió cada uno hasta la retirada', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    e = elige(e, ana, 'vuelvo');
    const tv = proyectarTV(e, { restanteMs: 1000 });
    expect(tv.jugadores.find((j) => j.id === ana)).toMatchObject({ eligio: true, eleccion: null });
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    const enRetirada = proyectarTV(e, { restanteMs: 1000 });
    expect(enRetirada.jugadores.map((j) => j.eleccion)).toEqual(['vuelvo', 'sigo', 'sigo']);
    expect(enRetirada.retirada!.volvieron).toEqual(['ana']);
  });

  test('en la retirada siguiente, el que ya había vuelto no aparece eligiendo', () => {
    let e = vence(vence(mesa([h(9), h(3), h(5)])));
    e = elige(e, ana, 'vuelvo');
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'sigo');
    e = vence(vence(e)); // revela y abre otra decisión
    e = elige(e, beto, 'sigo');
    e = elige(e, caro, 'vuelvo');
    const tv = proyectarTV(e, { restanteMs: null });
    expect(tv.jugadores.map((j) => j.eleccion)).toEqual([null, 'sigo', 'vuelvo']);
  });

  test('la TV nunca manda el baúl; el celular manda solo el propio', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    for (const id of [ana, beto, caro]) e = elige(e, id, 'vuelvo');
    const tv = proyectarTV(e, { restanteMs: null });
    expect(JSON.stringify(tv)).not.toContain('baul');
    const celu = proyectarJugador(e, ana, { restanteMs: null })!;
    expect(celu.yo.baul).toBe(3);
  });

  test('el celular sabe cuándo tiene que tocar', () => {
    let e = vence(vence(mesa([h(9), h(3)])));
    expect(proyectarJugador(e, ana, { restanteMs: null })!.puedoElegir).toBe(true);
    e = elige(e, ana, 'sigo');
    expect(proyectarJugador(e, ana, { restanteMs: null })!.puedoElegir).toBe(false);
  });

  test('los peligros a la vista son los que ya salieron esta noche', () => {
    let e = vence(mesa([p('puma'), h(3)]));
    const tv = proyectarTV(e, { restanteMs: null });
    expect(tv.peligrosALaVista.map((x) => x.tipo)).toEqual(['puma']);
    expect(tv.relato).toBe('aparece puma');
    e = vence(e);
    expect(proyectarTV(e, { restanteMs: null }).relato).toBeNull();
  });
});
