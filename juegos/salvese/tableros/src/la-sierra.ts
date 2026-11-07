import type { Tablero } from './schema.js';

/** El base. Si algo se prueba primero, se prueba acá. */
export const laSierra: Tablero = {
  id: 'la-sierra',
  nombre: 'La Sierra',
  regla: 'Cinco noches, tres copias de cada peligro. El tablero base.',
  noches: 5,
  tesoro: 'plata',

  paleta: {
    cielo: '#0b1020',
    cerroLejano: '#2a3450',
    cerroMedio: '#161d31',
    cerroCercano: '#080b14',
    brasa: '#ff7a3c',
  },
  fondos: { camino: 'filo-noche', campamento: 'fogata-cerro', final: 'amanecer-sierra' },

  // 111 en total por noche. Repartido entre cinco, una noche entera bien
  // jugada da unos 15 por cabeza: lo justo para que perder 12 duela.
  hallazgos: [
    { valor: 1, nombre: 'un patacón suelto' },
    { valor: 2, nombre: 'una hebilla de plata' },
    { valor: 3, nombre: 'unas espuelas viejas' },
    { valor: 4, nombre: 'un mate con virola' },
    { valor: 5, nombre: 'una bolsita escondida' },
    { valor: 5, nombre: 'un rastro de veta' },
    { valor: 6, nombre: 'un cuchillo de plata' },
    { valor: 7, nombre: 'la alforja de un arriero' },
    { valor: 8, nombre: 'una veta a la vista' },
    { valor: 9, nombre: 'un estribo labrado' },
    { valor: 10, nombre: 'la caja de un capataz' },
    { valor: 11, nombre: 'una veta gruesa' },
    { valor: 12, nombre: 'un cofre enterrado' },
    { valor: 13, nombre: 'la mina abandonada' },
    { valor: 15, nombre: 'el tesoro de la capilla' },
  ],

  peligros: [
    {
      tipo: 'puma',
      nombre: 'el puma',
      icono: '🐾',
      susto: 'Huellas frescas. Grandes. Van para donde van ustedes.',
      golpe: 'El puma volvió, y esta vez no se fue solo.',
    },
    {
      tipo: 'derrumbe',
      nombre: 'el derrumbe',
      icono: '🪨',
      susto: 'Caen piedritas de arriba. Por ahora, piedritas.',
      golpe: 'Se vino el cerro abajo. Lo que cargaban quedó debajo.',
    },
    {
      tipo: 'tormenta',
      nombre: 'la tormenta',
      icono: '⛈️',
      susto: 'Truena lejos. Alguien dice que no es nada.',
      golpe: 'No era nada. Era la tormenta, y se llevó todo.',
    },
    {
      tipo: 'crecida',
      nombre: 'la crecida',
      icono: '🌊',
      susto: 'El arroyo trae ramas. Sube un poco.',
      golpe: 'Bajó la crecida de golpe. Las alforjas flotan, ya lejos.',
    },
    {
      tipo: 'niebla',
      nombre: 'la niebla',
      icono: '🌫️',
      susto: 'Baja la niebla. No se ve al de adelante.',
      golpe: 'En la niebla se perdieron, y con ellos lo que traían.',
    },
  ],
  copiasPorPeligro: 3,
};
