import type { Tablero } from './schema.js';

/** El base. Raciones y frío. Si algo se prueba primero, se prueba acá. */
export const laSierra: Tablero = {
  id: 'la-sierra',
  nombre: 'La Sierra',
  noches: 5,
  distancia: 24,
  recursoCritico: { id: 'raciones', nombre: 'raciones', inicial: 30, capacidad: 40 },
  regla: 'El tablero base: nada se rompe. Se come, se camina y hace frío.',

  paleta: {
    cielo: '#0b1020',
    cerroLejano: '#2a3450',
    cerroMedio: '#161d31',
    cerroCercano: '#080b14',
    brasa: '#ff7a3c',
  },

  cerros: [
    {
      profundidad: 'lejano',
      puntos: [
        [0, 0.62], [0.18, 0.48], [0.31, 0.55], [0.47, 0.38], [0.62, 0.5], [0.8, 0.44], [1, 0.58],
      ],
    },
    {
      profundidad: 'medio',
      puntos: [
        [0, 0.74], [0.22, 0.6], [0.4, 0.68], [0.58, 0.54], [0.75, 0.66], [1, 0.7],
      ],
    },
    {
      profundidad: 'cercano',
      puntos: [
        [0, 0.88], [0.25, 0.8], [0.5, 0.86], [0.72, 0.78], [1, 0.85],
      ],
    },
  ],

  tramos: [
    {
      id: 'cuesta-del-viento',
      nombre: 'la cuesta del viento',
      dureza: 2,
      costoRecurso: 1,
      hallazgo: 0.15,
      pista: 'sube',
      terreno: 'Piedra suelta todo el ascenso. Se llega más lejos, pero nadie llega entero.',
    },
    {
      id: 'vado-bajo',
      nombre: 'el vado bajo',
      dureza: 0,
      costoRecurso: 0,
      hallazgo: 0.1,
      pista: 'agua cerca',
      terreno: 'Cómodo y sin sorpresas. Es el tramo que no le va a hacer daño a nadie.',
    },
    {
      id: 'quebrada-seca',
      nombre: 'la quebrada seca',
      dureza: 1,
      costoRecurso: 2,
      hallazgo: 0.35,
      pista: 'atajo',
      terreno: 'Corta camino de verdad, pero no hay con qué reponer. Se paga en raciones.',
    },
    {
      id: 'filo-largo',
      nombre: 'el filo largo',
      dureza: 3,
      costoRecurso: 1,
      hallazgo: 0.45,
      pista: 'a la vista',
      terreno: 'Expuesto al viento y a lo que haya. Ahí arriba se ve todo, y a vos también.',
    },
    {
      id: 'bosque-de-tabaquillo',
      nombre: 'el bosque de tabaquillo',
      dureza: 1,
      costoRecurso: -1,
      hallazgo: 0.2,
      pista: 'reparo',
      terreno: 'Leña y reparo. Se avanza poco y se duerme bien, que a veces alcanza.',
    },
    {
      id: 'paso-de-las-piedras',
      nombre: 'el paso de las piedras',
      dureza: 2,
      costoRecurso: 0,
      hallazgo: 0.3,
      pista: 'angosto',
      terreno: 'De a uno y despacio. Lo que se pierde en tiempo no se pierde en fuerzas.',
    },
    {
      id: 'huella-vieja',
      nombre: 'la huella vieja',
      dureza: 1,
      costoRecurso: 1,
      hallazgo: 0.25,
      pista: 'ya pasaron',
      terreno: 'Alguien la abrió antes. Lo que dejaron puede servir o puede explicar por qué la dejaron.',
    },
  ],

  mazoObjetos: [
    {
      id: 'catalejo-rajado',
      nombre: 'el catalejo rajado',
      clase: 'redistribuye',
      efecto: 'quien lo carga ve el terreno de un segundo tramo esta noche',
      usos: 3,
    },
    {
      id: 'atado-sin-abrir',
      nombre: 'el atado sin abrir',
      clase: 'no_identificado',
      efecto: 'al usarse resuelve como otro arquetipo del mazo, elegido por el motor',
      usos: 1,
    },
    {
      id: 'yunque-de-mano',
      nombre: 'el yunque de mano',
      clase: 'pesa',
      efecto: 'ocupa 5 de capacidad; el trabajo pesado cuesta 1 vigor menos',
      usos: 4,
    },
    {
      id: 'aguardiente',
      nombre: 'el aguardiente',
      clase: 'dano_diferido',
      efecto: 'restaura 1 vigor a todos ahora; en la noche 5 todos pierden 1',
      usos: 1,
    },
    {
      id: 'moneda-en-el-bolsillo',
      nombre: 'la moneda en el bolsillo',
      clase: 'de_bolsillo',
      efecto: 'quien la encuentra decide si la declara; sin declarar cuenta para su objetivo',
      usos: 1,
    },
    {
      id: 'manta-de-lana',
      nombre: 'la manta de lana',
      clase: 'redistribuye',
      efecto: 'quien la carga puede pasarle 1 vigor a otro viajero al cerrar la noche',
      usos: 2,
    },
  ],

  objetivos: [
    {
      id: 'llegar-entero',
      texto: 'Llegar sin haberte quebrado nunca.',
      condicion: 'vigor > 0 en todas las noches',
    },
    {
      id: 'que-nadie-quede',
      texto: 'Que ningún viajero termine quebrado.',
      condicion: 'ningún viajero con vigor 0 al final',
    },
    {
      id: 'sobre-raciones',
      texto: 'Que sobren raciones al llegar.',
      condicion: 'recurso final >= 5',
    },
    {
      id: 'el-perro-llega',
      texto: 'Que el perro llegue.',
      condicion: 'perro.presente al final',
    },
    {
      id: 'mano-propia',
      texto: 'Haber hecho el trabajo pesado más noches que cualquier otro.',
      condicion: 'máximo estricto de noches en esfuerzo',
    },
    {
      id: 'nunca-el-atajo',
      texto: 'Que la caravana no haya tomado nunca el atajo.',
      condicion: 'ningún tramo con costoRecurso >= 2 elegido',
    },
    {
      id: 'ver-el-final',
      texto: 'Llegar. Nada más que eso.',
      condicion: 'avance >= distancia',
    },
  ],

  vozDelCamino:
    'Seco, corto, en presente. El camino cuenta lo que pasó como quien informa el clima: ' +
    'sin adjetivos de más, sin moraleja y sin lástima. Rioplatense, voseo. Nunca solemne, ' +
    'nunca gracioso a propósito. Si algo salió mal, se dice y se sigue.',

  fondos: ['fogata-cerro', 'fogata-vado', 'filo-noche', 'bosque-bajo', 'amanecer-sierra'],

  respaldos: {
    resolucion: [
      'La caravana avanza. El frío entra por donde puede.',
      'Se camina. Nadie dice nada hasta que aparece el reparo.',
      'La noche se hace larga y el paso se acorta.',
    ],
    fogon: [
      '¿Quién decidió esto, en serio?',
      '¿A quién le hubiera tocado peor?',
      'Si mañana sale igual, ¿lo vuelven a hacer?',
    ],
    trato: ['Hay algo que te conviene y no le conviene a los demás.'],
    apodo: ['El que no quería subir.'],
    epilogo: ['Llegaron. O no. El cerro no lleva la cuenta.'],
  },
};
