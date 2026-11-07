import type { Tablero } from './schema.js';

/**
 * El difícil. Cuatro copias de cada peligro: el segundo igual sale mucho
 * antes. A cambio, cada hallazgo vale más. Es el tablero de volverse temprano
 * y de odiar al que se quedó y le salió bien.
 */
export const elSalitral: Tablero = {
  id: 'el-salitral',
  nombre: 'El Salitral',
  regla: 'Cuatro copias de cada peligro, pero todo vale más.',
  noches: 5,
  tesoro: 'sal',

  paleta: {
    cielo: '#14121c',
    cerroLejano: '#4a4458',
    cerroMedio: '#2b2734',
    cerroCercano: '#121016',
    brasa: '#ffb05a',
  },
  fondos: { camino: 'salitral-luna', campamento: 'fogata-vado', final: 'amanecer-sal' },

  hallazgos: [
    { valor: 2, nombre: 'un puñado de sal fina' },
    { valor: 3, nombre: 'una costra blanca' },
    { valor: 4, nombre: 'un bloque partido' },
    { valor: 5, nombre: 'la carga de una mula' },
    { valor: 6, nombre: 'un panal de sal' },
    { valor: 7, nombre: 'una bolsa olvidada' },
    { valor: 8, nombre: 'un pozo de salmuera' },
    { valor: 9, nombre: 'la tropa de un salinero' },
    { valor: 10, nombre: 'un bloque entero' },
    { valor: 11, nombre: 'un manto sin pisar' },
    { valor: 12, nombre: 'la carreta volcada' },
    { valor: 14, nombre: 'el depósito del puesto' },
    { valor: 15, nombre: 'una laguna seca' },
    { valor: 17, nombre: 'la salina vieja' },
    { valor: 19, nombre: 'el corazón del salar' },
  ],

  peligros: [
    {
      tipo: 'vibora',
      nombre: 'la yarará',
      icono: '🐍',
      susto: 'Algo se arrastró entre las matas. Nadie quiere mirar.',
      golpe: 'La yarará otra vez. Sueltan todo y corren.',
    },
    {
      tipo: 'sed',
      nombre: 'la sed',
      icono: '🥵',
      susto: 'Las cantimploras suenan huecas.',
      golpe: 'La sed no perdona. Cambiaron todo por un trago.',
    },
    {
      tipo: 'helada',
      nombre: 'la helada',
      icono: '❄️',
      susto: 'Baja el frío de golpe. Se escarcha la sal.',
      golpe: 'La helada les entumeció las manos. Se les cayó todo.',
    },
    {
      tipo: 'remolino',
      nombre: 'el remolino',
      icono: '🌪️',
      susto: 'Un remolino de polvo cruza a lo lejos.',
      golpe: 'El remolino les pasó por encima. No quedó nada.',
    },
    {
      tipo: 'espejismo',
      nombre: 'el espejismo',
      icono: '👁️',
      susto: 'Hay agua adelante. O eso parece.',
      golpe: 'Corrieron hacia el agua. No había. Tampoco quedó la carga.',
    },
  ],
  copiasPorPeligro: 4,
};
