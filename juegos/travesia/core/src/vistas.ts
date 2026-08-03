/**
 * Proyecciones del estado autoritativo. Es lo único que sale del servidor.
 *
 * La ocultación de información se hace acá y solo acá. Si un cliente tuviera que
 * decidir qué no mostrar, alcanzaría con abrir el inspector para romper el juego.
 */

import type { JugadorId, ObjetoId, TramoId } from './ids.js';
import type { EntradaCronica, Fase, NivelRaciones, Vigor } from './estado.js';
import type { Rol } from './roles.js';

/** Lo que se pinta en la TV. Todo esto es público por definición. */
export interface VistaTV {
  fase: Fase;
  noche: number;
  nochesTotales: number;
  /** 0..1 sobre la distancia total. La caravana se dibuja con esto. */
  progreso: number;
  /** 0..1 de la ventana de la fase. La llama se consume con esto. */
  reloj: number;
  /** La TV muestra dígitos solo en los últimos 30 segundos (D3). */
  mostrarDigitos: boolean;
  tablero: { id: string; nombre: string; paleta: Paleta; tramo: string };
  /** Sin números: barras cortas, siluetas, quién ya bloqueó. */
  viajeros: ViajeroPublico[];
  perro: { presente: boolean; alerta: string };
  /** Nombre y silueta nada más. El efecto no es público hasta que se usa. */
  objetos: { id: ObjetoId; nombre: string; portador?: JugadorId }[];
  candidatos: { id: TramoId; nombre: string; pista: string }[];
  ultimaCronica?: EntradaCronica;
  /** Disparadores de animación. La TV nunca decide sola cuándo animar (D4). */
  gatillos: Gatillo[];
}

export interface ViajeroPublico {
  id: JugadorId;
  nombre: string;
  rol: Rol;
  /** Cualitativo. La Curandera ve estados, no números que pueda dictar. */
  aspecto: 'entero' | 'cansado' | 'al_limite' | 'quebrado';
  bloqueo: 'pendiente' | 'listo';
  cargaObjeto: boolean;
}

export interface Paleta {
  cielo: string;
  cerroLejano: string;
  cerroMedio: string;
  cerroCercano: string;
  brasa: string;
}

export type Gatillo =
  | { tipo: 'ambiente' }
  | { tipo: 'resolucion'; duracionMs: number }
  | { tipo: 'alerta'; que: 'objeto' | 'quiebre' | 'perro'; duracionMs: number };

/**
 * Lo que ve un celular. Una sola cosa por pantalla, legible en 10 segundos (D1).
 *
 * `linea` es el tutorial encubierto (D8): en la noche 1 el celular no ofrece
 * opciones, dicta qué decir en voz alta.
 */
export interface VistaJugador {
  yo: { id: JugadorId; nombre: string; rol: Rol; llano: string };
  fase: Fase;
  noche: number;
  /** Texto para decir en voz alta. Si viene, va en lugar de las opciones. */
  linea?: string;
  /** Lo que este rol ve esta noche y nadie más. Vacío si está cegado. */
  revelacion?: Revelacion;
  /** Qué puede hacer ahora. Vacío = no le toca; la pantalla dice "hablá". */
  acciones: Accion[];
  /** Su boleta actual, si ya bloqueó. */
  boleta?: { ruta: TramoId; raciones: NivelRaciones; esfuerzo: JugadorId[] };
  /** Solo para el destinatario del trato, y solo esa noche (D9). */
  trato?: { texto: string; costo: string };
}

export type Revelacion =
  | { tipo: 'terreno'; tramo: TramoId; nombre: string; texto: string }
  | { tipo: 'gente'; filas: { jugador: JugadorId; nombre: string; estado: string }[] }
  | { tipo: 'inventario'; recurso: number; capacidad: number; nombreRecurso: string }
  | { tipo: 'registro'; texto: string; confiable: boolean }
  | { tipo: 'mando'; texto: string };

export type Accion =
  | { tipo: 'elegir_ruta'; opciones: { id: TramoId; nombre: string; pista: string }[] }
  | { tipo: 'elegir_raciones'; opciones: NivelRaciones[] }
  | { tipo: 'elegir_esfuerzo'; opciones: JugadorId[]; max: number }
  | { tipo: 'bloquear' }
  | { tipo: 'responder_trato' }
  | { tipo: 'entregar_objeto'; objeto: ObjetoId; candidatos: JugadorId[] }
  | { tipo: 'votar_tablero'; opciones: { id: string; nombre: string }[] };

/** El aspecto público sale del vigor. Un solo lugar para que TV y celular coincidan. */
export function aspectoDeVigor(vigor: Vigor): ViajeroPublico['aspecto'] {
  switch (vigor) {
    case 3:
      return 'entero';
    case 2:
      return 'cansado';
    case 1:
      return 'al_limite';
    case 0:
      return 'quebrado';
  }
}
