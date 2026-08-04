import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { reducir, registrarTablero } from './maquina.js';
import { proyectarJugador, proyectarTV } from './vistas.js';
import { jugadorId, partidaId } from './ids.js';
import type { EstadoPartida } from './estado.js';
import type { Comando } from './maquina.js';

// Tablero de prueba (La Sierra)
const laSierra = {
  id: 'la-sierra',
  nombre: 'La Sierra',
  noches: 5,
  distancia: 24,
  recursoCritico: { id: 'raciones', nombre: 'raciones', inicial: 30, capacidad: 40 },
  tramos: [
    { id: 'cuesta-del-viento', nombre: 'la cuesta del viento', dureza: 2, costoRecurso: 1, hallazgo: 0.15, pista: 'sube', terreno: 'Piedra suelta todo el ascenso. Se llega más lejos, pero nadie llega entero.' },
    { id: 'vado-bajo', nombre: 'el vado bajo', dureza: 0, costoRecurso: 0, hallazgo: 0.1, pista: 'agua cerca', terreno: 'Cómodo y sin sorpresas. Es el tramo que no le va a hacer daño a nadie.' },
    { id: 'quebrada-seca', nombre: 'la quebrada seca', dureza: 1, costoRecurso: 2, hallazgo: 0.35, pista: 'atajo', terreno: 'Corta camino de verdad, pero no hay con qué reponer. Se paga en raciones.' },
    { id: 'filo-largo', nombre: 'el filo largo', dureza: 3, costoRecurso: 1, hallazgo: 0.45, pista: 'a la vista', terreno: 'Expuesto al viento y a lo que haya. Ahí arriba se ve todo, y a vos también.' },
    { id: 'bosque-de-tabaquillo', nombre: 'el bosque de tabaquillo', dureza: 1, costoRecurso: -1, hallazgo: 0.2, pista: 'reparo', terreno: 'Leña y reparo. Se avanza poco y se duerme bien, que a veces alcanza.' },
    { id: 'paso-de-las-piedras', nombre: 'el paso de las piedras', dureza: 2, costoRecurso: 0, hallazgo: 0.3, pista: 'angosto', terreno: 'De a uno y despacio. Lo que se pierde en tiempo no se pierde en fuerzas.' },
    { id: 'huella-vieja', nombre: 'la huella vieja', dureza: 1, costoRecurso: 1, hallazgo: 0.25, pista: 'ya pasaron', terreno: 'Alguien la abrió antes. Lo que dejaron puede servir.' },
  ],
  mazoObjetos: [
    { id: 'catalejo-rajado', nombre: 'el catalejo rajado', clase: 'redistribuye' as const, efecto: 'Ve un segundo tramo', usos: 3 },
    { id: 'yunque-de-mano', nombre: 'el yunque de mano', clase: 'pesa' as const, efecto: 'Trabajo pesado cuesta 1 menos', usos: 4 },
  ],
  objetivos: [
    { id: 'llegar-entero', texto: 'Llegar sin haberte quebrado nunca.', condicion: 'vigor > 0' },
    { id: 'que-nadie-quede', texto: 'Que ningún viajero termine quebrado.', condicion: '...' },
    { id: 'sobre-raciones', texto: 'Que sobren raciones al llegar.', condicion: '...' },
    { id: 'el-perro-llega', texto: 'Que el perro llegue.', condicion: '...' },
    { id: 'ver-el-final', texto: 'Llegar.', condicion: '...' },
  ],
  vozDelCamino: 'Seco y cortante',
  fondos: ['fogata-cerro'],
  respaldos: {
    resolucion: ['Avanzamos por la sierra.'],
    fogon: ['¿Quién decidió esto?'],
  },
};

registrarTablero('la-sierra', laSierra as any);

async function main() {
  const rl = readline.createInterface({ input, output });
  console.log('=== SIMULADOR DE Sálvese quien pueda! ===');
  console.log('Tablero: La Sierra');

  let estado: EstadoPartida = {
    id: partidaId('partida-runner'),
    tablero: 'la-sierra' as any,
    semilla: 'runner-seed',
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

  // Crear la partida
  let r = reducir(estado, { t: 'crear', tablero: 'la-sierra' as any, semilla: 'runner-seed' });
  if (r.ok) estado = r.transicion.estado;

  // Registrar 3 jugadores fijos para la prueba
  const nombres = ['Nico', 'Vale', 'Seba'];
  const ids = [jugadorId('j-1'), jugadorId('j-2'), jugadorId('j-3')];

  for (let i = 0; i < 3; i++) {
    r = reducir(estado, { t: 'sumar_jugador', jugador: ids[i]!, nombre: nombres[i]! });
    if (r.ok) estado = r.transicion.estado;
    r = reducir(estado, { t: 'marcar_listo', jugador: ids[i]!, listo: true });
    if (r.ok) estado = r.transicion.estado;
  }

  // Empezar
  r = reducir(estado, { t: 'empezar' });
  if (r.ok) estado = r.transicion.estado;

  // Reparto -> Acampar (noche 1)
  r = reducir(estado, { t: 'vencio_fase' });
  if (r.ok) estado = r.transicion.estado;

  // Loop de juego
  while (estado.fase !== 'epilogo') {
    if (estado.fase === 'acampar') {
      console.log(`\n=== NOCHE ${estado.noche} - ACAMPAR ===`);
      console.log(`Avance: ${estado.avance}/${estado.distanciaTotal} leguas.`);
      console.log(`Recurso (raciones): ${estado.recurso}/${estado.capacidad}.`);
      console.log(`Alerta del Perro: ${estado.perro.alerta} (Presente: ${estado.perro.presente})`);

      // Pasar a decidir
      r = reducir(estado, { t: 'vencio_fase' });
      if (r.ok) estado = r.transicion.estado;
    }

    if (estado.fase === 'decidir') {
      console.log(`\n=== NOCHE ${estado.noche} - DECIDIR ===`);
      const candidatos = estado.nocheActual!.candidatos;
      console.log('Candidatos de ruta:');
      candidatos.forEach((c, index) => {
        console.log(`  [${index}] ${c.nombre} (Pista: "${c.pista}")`);
      });

      // Votos de cada jugador
      for (const jugador of estado.viajeros) {
        console.log(`\n--- Turno de ${jugador.nombre} (${jugador.rol}) ---`);
        const vista = proyectarJugador(estado, jugador.id);

        if (vista.revelacion) {
          console.log(`>> REVELACIÓN:`, JSON.stringify(vista.revelacion));
        }
        if (vista.linea) {
          console.log(`>> TUTORIAL: ${vista.linea}`);
        }

        // Selección de ruta
        let rutaIdx = 0;
        if (estado.noche > 1) {
          const ans = await rl.question(`Elegí ruta (0-${candidatos.length - 1}): `);
          rutaIdx = parseInt(ans) || 0;
        } else {
          console.log('(Noche 1: Se autocompleta la ruta por el tutorial)');
        }
        const rutaElegida = candidatos[rutaIdx]!.id;

        // Selección de raciones
        console.log('Raciones: [0] ajustado, [1] normal, [2] abundante');
        const ansRac = await rl.question('Elegí raciones (0-2): ');
        const raciones = (['ajustado', 'normal', 'abundante'] as const)[parseInt(ansRac) || 1]!;

        // Selección de esfuerzo
        const esfuerzo: typeof jugador.id[] = [];
        console.log('Esfuerzo pesado (mandar viajeros a trabajar):');
        estado.viajeros.forEach((v, index) => {
          console.log(`  [${index}] ${v.nombre} (Vigor: ${v.vigor})`);
        });
        const ansEsf = await rl.question('Asignar a esfuerzo (índices separados por comas, ej: 0,1): ');
        if (ansEsf.trim()) {
          ansEsf.split(',').forEach((idx) => {
            const v = estado.viajeros[parseInt(idx.trim())];
            if (v && v.vigor > 0) esfuerzo.push(v.id);
          });
        }

        // Enviar elección
        r = reducir(estado, {
          t: 'elegir',
          jugador: jugador.id,
          ruta: rutaElegida,
          raciones,
          esfuerzo,
        });
        if (r.ok) estado = r.transicion.estado;

        // Bloquear boleta
        r = reducir(estado, { t: 'bloquear', jugador: jugador.id });
        if (r.ok) estado = r.transicion.estado;
      }
    }

    if (estado.fase === 'resolver') {
      console.log(`\n=== NOCHE ${estado.noche} - RESOLVER ===`);
      const ultimaCronica = estado.cronica[estado.cronica.length - 1]!;
      console.log('Hechos:', ultimaCronica.hechos.join(' | '));
      console.log('Relato de respaldo:', ultimaCronica.relato);

      // Pasar a fogón
      r = reducir(estado, { t: 'vencio_fase' });
      if (r.ok) estado = r.transicion.estado;
    }

    if (estado.fase === 'fogon') {
      console.log(`\n=== NOCHE ${estado.noche} - FOGÓN ===`);
      console.log('Discusión en el fogón... (Presioná Enter para continuar al siguiente día)');
      await rl.question('');

      // Pasar al siguiente día
      r = reducir(estado, { t: 'vencio_fase' });
      if (r.ok) estado = r.transicion.estado;
    }
  }

  // Fin
  console.log('\n================================');
  console.log('=== PARTIDA FINALIZADA ===');
  console.log(`Avance final: ${estado.avance}/${estado.distanciaTotal} leguas.`);
  console.log(`Recurso final: ${estado.recurso}`);
  if (estado.desenlace) {
    console.log(`Resultado: ${estado.desenlace.llegaron ? '¡Llegaron a salvo!' : 'No llegaron a destino.'}`);
    console.log(`Perro llegó: ${estado.desenlace.perroLlego ? 'Sí' : 'Se perdió en el camino'}`);
    console.log('Objetivos personales cumplidos:');
    estado.viajeros.forEach((v) => {
      const cumplido = estado.desenlace?.objetivosCumplidos.includes(v.id);
      console.log(`  - ${v.nombre} (${v.rol}): ${cumplido ? 'CUMPLIDO' : 'FALLADO'}`);
    });
  }
  rl.close();
}

main().catch(console.error);
