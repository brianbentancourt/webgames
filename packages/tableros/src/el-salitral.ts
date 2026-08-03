import type { Tablero } from './schema.js';

/**
 * El segundo tablero del MVP. Existe para obligar a abstraer bien: si el motor
 * solo corre La Sierra, el tablero está hardcodeado y todavía no lo sabés (D12).
 *
 * Rompe: el recurso es agua y se viaja de noche. El Baqueano casi no ve y el
 * Memorioso pasa a ser el rol fuerte.
 */
export const elSalitral: Tablero = {
  id: 'el-salitral',
  nombre: 'El Salitral',
  noches: 5,
  distancia: 28,
  recursoCritico: { id: 'agua', nombre: 'agua', inicial: 24, capacidad: 30 },
  regla:
    'El recurso es agua y se viaja de noche: el Baqueano ve el terreno de media ruta ' +
    'y el registro del Memorioso deja de mentir.',

  paleta: {
    cielo: '#080d1c',
    cerroLejano: '#3a3550',
    cerroMedio: '#1d1a2c',
    cerroCercano: '#0a0910',
    brasa: '#ffb05e',
  },

  cerros: [
    {
      profundidad: 'lejano',
      puntos: [
        [0, 0.66], [0.3, 0.63], [0.55, 0.65], [0.78, 0.62], [1, 0.66],
      ],
    },
    {
      profundidad: 'medio',
      puntos: [
        [0, 0.78], [0.35, 0.76], [0.64, 0.79], [1, 0.77],
      ],
    },
    {
      profundidad: 'cercano',
      puntos: [
        [0, 0.9], [0.4, 0.88], [0.7, 0.91], [1, 0.89],
      ],
    },
  ],

  tramos: [
    {
      id: 'costra-blanca',
      nombre: 'la costra blanca',
      dureza: 1,
      costoRecurso: 2,
      hallazgo: 0.1,
      pista: 'plano',
      terreno: 'Se camina rápido y se transpira todo. El plano acá no es un regalo.',
    },
    {
      id: 'medanos',
      nombre: 'los médanos',
      dureza: 3,
      costoRecurso: 1,
      hallazgo: 0.4,
      pista: 'blando',
      terreno: 'Un paso adelante y medio atrás. Lo que se pierde ahí no se recupera.',
    },
    {
      id: 'la-aguada',
      nombre: 'la aguada',
      dureza: 2,
      costoRecurso: -2,
      hallazgo: 0.15,
      pista: 'desvío',
      terreno: 'Hay agua. Está lejos y hay que ir. Es la única forma de reponer en el tablero.',
    },
    {
      id: 'huella-de-carro',
      nombre: 'la huella de carro',
      dureza: 0,
      costoRecurso: 1,
      hallazgo: 0.25,
      pista: 'marcado',
      terreno: 'Alguien pasó con carga. Se sigue fácil hasta que se entiende por qué la dejaron.',
    },
    {
      id: 'sombra-del-monte',
      nombre: 'la sombra del monte',
      dureza: 1,
      costoRecurso: 0,
      hallazgo: 0.3,
      pista: 'espinoso',
      terreno: 'Reparo de día, ramas de noche. Barato en agua, caro en piel.',
    },
    {
      id: 'la-lengua-de-sal',
      nombre: 'la lengua de sal',
      dureza: 2,
      costoRecurso: 3,
      hallazgo: 0.5,
      pista: 'brilla',
      terreno: 'Corta media noche de viaje. También corta el agua de media travesía.',
    },
  ],

  mazoObjetos: [
    {
      id: 'bordalesa',
      nombre: 'la bordalesa',
      clase: 'pesa',
      efecto: 'suma 8 de capacidad de agua; el trabajo pesado cuesta 1 vigor más',
      usos: 5,
    },
    {
      id: 'mapa-de-aguadas',
      nombre: 'el mapa de aguadas',
      clase: 'redistribuye',
      efecto: 'quien lo carga ve el costoRecurso de todos los tramos de la noche',
      usos: 3,
    },
    {
      id: 'garrafa-sin-marca',
      nombre: 'la garrafa sin marca',
      clase: 'no_identificado',
      efecto: 'al usarse repone agua o la echa a perder; lo resuelve el motor',
      usos: 1,
    },
    {
      id: 'sal-en-el-bolsillo',
      nombre: 'la sal en el bolsillo',
      clase: 'de_bolsillo',
      efecto: 'quien la encuentra decide si la declara; sin declarar cuenta para su objetivo',
      usos: 1,
    },
    {
      id: 'lampara-de-kerosene',
      nombre: 'la lámpara de kerosene',
      clase: 'dano_diferido',
      efecto: 'anula la ceguera del Baqueano dos noches; la última noche nadie ve nada',
      usos: 2,
    },
  ],

  objetivos: [
    {
      id: 'agua-de-sobra',
      texto: 'Llegar con agua de sobra.',
      condicion: 'recurso final >= 6',
    },
    {
      id: 'nunca-la-aguada',
      texto: 'Que no haya hecho falta desviarse nunca.',
      condicion: 'ningún tramo con costoRecurso < 0 elegido',
    },
    {
      id: 'que-nadie-quede',
      texto: 'Que ningún viajero termine quebrado.',
      condicion: 'ningún viajero con vigor 0 al final',
    },
    {
      id: 'el-perro-llega',
      texto: 'Que el perro llegue.',
      condicion: 'perro.presente al final',
    },
    {
      id: 'cruzar-la-sal',
      texto: 'Haber cruzado la lengua de sal.',
      condicion: 'tramo la-lengua-de-sal elegido al menos una vez',
    },
    {
      id: 'sin-carga',
      texto: 'Llegar sin cargar nada.',
      condicion: 'nunca portador de un objeto',
    },
  ],

  vozDelCamino:
    'Más corto todavía que en la sierra. De noche se habla poco. Frases de menos de diez ' +
    'palabras, sin metáforas, rioplatense, voseo. El calor y la sed se nombran por lo que ' +
    'hacen, nunca por lo que se sienten.',

  fondos: ['salitral-luna', 'medano-noche', 'aguada', 'monte-bajo', 'amanecer-sal'],

  respaldos: {
    resolucion: [
      'Se camina de noche. La sal cruje y no se dice nada.',
      'Avanzan mientras dura el fresco.',
      'La luna alcanza para ver el piso y poco más.',
    ],
    fogon: [
      '¿Cuánta agua creen que queda?',
      '¿Quién tomó de más y no lo dijo?',
      '¿Se desviarían mañana por una aguada que no vieron?',
    ],
    trato: ['Hay una aguada que solo vos sabés dónde está.'],
    apodo: ['El que tenía sed.'],
    epilogo: ['Salieron del salitral. Lo que trajeron es otra cuenta.'],
  },
};
