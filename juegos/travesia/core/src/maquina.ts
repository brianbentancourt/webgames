import type { JugadorId, TableroId, TramoId, ObjetoId, ObjetivoId } from './ids.js';
import { jugadorId, objetoId } from './ids.js';
import type { EstadoPartida, NivelRaciones, Viajero, EstadoNoche, Boleta, EntradaCronica, Fase, Vigor, Tramo } from './estado.js';
import type { Escena, PedidoRelato, ResultadoRelato } from './llm.js';
import { VIGOR_MAX, VIGOR_INICIAL, RACIONES, AVANCE, TIEMPOS, ventanaDecidirMs, PERRO_MIENTE } from './config.js';
import { crearRng } from './rng.js';
import { REPARTO, type Rol } from './roles.js';

export type Comando =
  | { t: 'crear'; tablero: TableroId; semilla: string }
  | { t: 'sumar_jugador'; jugador: JugadorId; nombre: string }
  | { t: 'quitar_jugador'; jugador: JugadorId }
  | { t: 'marcar_listo'; jugador: JugadorId; listo: boolean }
  | { t: 'empezar' }
  | {
      t: 'elegir';
      jugador: JugadorId;
      ruta?: TramoId;
      raciones?: NivelRaciones;
      esfuerzo?: JugadorId[];
    }
  | { t: 'bloquear'; jugador: JugadorId }
  | { t: 'responder_trato'; jugador: JugadorId; acepta: boolean }
  | { t: 'entregar_objeto'; de: JugadorId; a: JugadorId }
  /** Vence el reloj de la fase actual. Lo dispara el servidor, no un jugador. */
  | { t: 'vencio_fase' }
  /** Llegó (o no) el texto del modelo. La partida no espera por esto. */
  | { t: 'relato_listo'; escena: Escena; resultado: ResultadoRelato };

export type Efecto =
  /** Volver a llamar a `reducir` con `vencio_fase` dentro de N ms. */
  | { t: 'agendar'; enMs: number }
  /** Pedirle el texto al modelo. Se dispara al empezar la animación (D6). */
  | { t: 'pedir_relato'; pedido: PedidoRelato }
  /** Reproyectar y mandar vistas. El servidor decide a quién. */
  | { t: 'publicar'; a: 'todos' | 'tv' | { jugador: JugadorId } }
  | { t: 'terminar' };

export interface Transicion {
  estado: EstadoPartida;
  efectos: Efecto[];
}

/** Motivo por el que un comando no se aplica. Nunca se lanza: se devuelve. */
export type Rechazo = { motivo: 'fuera_de_fase' | 'jugada_invalida' | 'jugador_desconocido' };

export type Resultado = { ok: true; transicion: Transicion } | { ok: false } & Rechazo;

export interface TableroDato {
  id: string;
  nombre: string;
  noches: number;
  distancia: number;
  recursoCritico: {
    id: string;
    nombre: string;
    inicial: number;
    capacidad: number;
  };
  tramos: {
    id: TramoId;
    nombre: string;
    dureza: number;
    costoRecurso: number;
    hallazgo: number;
    pista: string;
    terreno: string;
  }[];
  mazoObjetos: {
    id: string;
    nombre: string;
    clase: 'redistribuye' | 'no_identificado' | 'pesa' | 'dano_diferido' | 'de_bolsillo';
    efecto: string;
    usos: number;
  }[];
  objetivos: {
    id: string;
    texto: string;
    condicion: string;
  }[];
  vozDelCamino: string;
  fondos: string[];
  respaldos: Record<string, string[]>;
}

const tablerosRegistry = new Map<string, TableroDato>();

export function registrarTablero(id: string, tablero: TableroDato) {
  tablerosRegistry.set(id, tablero);
}

export function obtenerTablero(id: string): TableroDato {
  const t = tablerosRegistry.get(id);
  if (!t) {
    throw new Error(`Tablero con ID ${id} no registrado en el core`);
  }
  return t;
}

export function reducir(estado: EstadoPartida, comando: Comando): Resultado {
  const ahora = Date.now();

  if (comando.t === 'crear') {
    const tablero = obtenerTablero(comando.tablero);
    const nuevoEstado: EstadoPartida = {
      id: estado.id,
      tablero: comando.tablero,
      semilla: comando.semilla,
      fase: 'lobby',
      noche: 0,
      nochesTotales: tablero.noches,
      avance: 0,
      distanciaTotal: tablero.distancia,
      recurso: tablero.recursoCritico.inicial,
      capacidad: tablero.recursoCritico.capacidad,
      viajeros: [],
      perro: { presente: true, alerta: 'ninguna', dice_la_verdad: true },
      objetos: [],
      cronica: [],
    };
    return {
      ok: true,
      transicion: {
        estado: nuevoEstado,
        efectos: [{ t: 'publicar', a: 'todos' }],
      },
    };
  }

  // Comandos de lobby
  if (estado.fase === 'lobby') {
    if (comando.t === 'sumar_jugador') {
      if (estado.viajeros.some((v) => v.id === comando.jugador)) {
        return { ok: false, motivo: 'jugada_invalida' };
      }
      if (estado.viajeros.length >= 10) {
        return { ok: false, motivo: 'jugada_invalida' };
      }
      const nuevoViajero: Viajero = {
        id: comando.jugador,
        nombre: comando.nombre,
        rol: 'pasajero',
        asiento: estado.viajeros.length,
        vigor: VIGOR_INICIAL as Vigor,
        objetivo: '' as ObjetivoId,
        conectado: true,
        cegado: false,
        aceptoElTrato: false,
      };
      const nuevosViajeros = [...estado.viajeros, nuevoViajero];
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros: nuevosViajeros },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'quitar_jugador') {
      if (!estado.viajeros.some((v) => v.id === comando.jugador)) {
        return { ok: false, motivo: 'jugador_desconocido' };
      }
      const nuevosViajeros = estado.viajeros.filter((v) => v.id !== comando.jugador);
      // Reasignar asientos
      nuevosViajeros.forEach((v, i) => {
        v.asiento = i;
      });
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros: nuevosViajeros },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'marcar_listo') {
      const viajero = estado.viajeros.find((v) => v.id === comando.jugador);
      if (!viajero) return { ok: false, motivo: 'jugador_desconocido' };
      const nuevosViajeros = estado.viajeros.map((v) =>
        v.id === comando.jugador ? { ...v, listo: comando.listo } : v
      ) as any;
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros: nuevosViajeros },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'empezar') {
      const n = estado.viajeros.length;
      if (n < 2 || n > 10) return { ok: false, motivo: 'jugada_invalida' };

      const todosListos = estado.viajeros.every((v) => (v as any).listo === true);
      if (!todosListos) return { ok: false, motivo: 'jugada_invalida' };

      const rng = crearRng(estado.semilla);
      const rolesDisponibles = REPARTO[n]!;
      const rolesBarajados = rng.barajar(rolesDisponibles);

      const tablero = obtenerTablero(estado.tablero);
      const objetivosBarajados = rng.barajar(tablero.objetivos);

      const nuevosViajeros = estado.viajeros.map((v, i) => {
        const rol = rolesBarajados[i]!;
        const objetivo = objetivosBarajados[i]!.id as ObjetivoId;
        return {
          ...v,
          rol,
          objetivo,
          vigor: VIGOR_INICIAL as Vigor,
          asiento: i,
          conectado: true,
          cegado: false,
          aceptoElTrato: false,
        };
      });

      // Configurar parejas
      for (const v1 of nuevosViajeros) {
        const v2 = nuevosViajeros.find((x) => x.id !== v1.id && x.rol === v1.rol);
        if (v2) {
          v1.parejaDe = v2.id;
        }
      }

      const estadoSiguiente: EstadoPartida = {
        ...estado,
        fase: 'reparto',
        viajeros: nuevosViajeros,
      };

      return {
        ok: true,
        transicion: {
          estado: estadoSiguiente,
          efectos: [
            { t: 'agendar', enMs: 15_000 },
            { t: 'publicar', a: 'todos' },
          ],
        },
      };
    }

    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // reparto -> acampar
  if (estado.fase === 'reparto') {
    if (comando.t === 'vencio_fase') {
      const rng = crearRng(estado.semilla + '-noche-1');
      const tablero = obtenerTablero(estado.tablero);
      const tramosBarajados = rng.barajar(tablero.tramos);
      const candidatos = tramosBarajados.slice(0, 2) as any as Tramo[];

      // Calcular alerta del perro para la noche 1
      const durezaMax = Math.max(...candidatos.map((c) => c.dureza));
      const alertas: ('ninguna' | 'inquieto' | 'grune' | 'no_avanza')[] = [
        'ninguna',
        'inquieto',
        'grune',
        'no_avanza',
      ];
      const alertaCorrecta = alertas[durezaMax]!;
      let alerta = alertaCorrecta;
      let diceVerdad = true;
      if (rng.suerte(PERRO_MIENTE)) {
        const alternativas = alertas.filter((a) => a !== alertaCorrecta);
        alerta = rng.elegir(alternativas);
        diceVerdad = false;
      }

      const nocheActual: EstadoNoche = {
        numero: 1,
        candidatos,
        boletas: {},
        venceEn: ahora + TIEMPOS.acamparMs,
      };

      const nuevoEstado: EstadoPartida = {
        ...estado,
        fase: 'acampar',
        noche: 1,
        nocheActual,
        perro: { presente: true, alerta, dice_la_verdad: diceVerdad },
      };

      return {
        ok: true,
        transicion: {
          estado: nuevoEstado,
          efectos: [
            { t: 'agendar', enMs: TIEMPOS.acamparMs },
            { t: 'publicar', a: 'todos' },
          ],
        },
      };
    }
    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // acampar -> decidir
  if (estado.fase === 'acampar') {
    if (comando.t === 'responder_trato' && comando.jugador === estado.tratoOfrecidoA) {
      const viajeros = estado.viajeros.map((v) =>
        v.id === comando.jugador ? { ...v, aceptoElTrato: comando.acepta } : v
      );
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'entregar_objeto') {
      const de = estado.viajeros.find((v) => v.id === comando.de);
      const a = estado.viajeros.find((v) => v.id === comando.a);
      if (!de || !a || !de.objeto || a.objeto) {
        return { ok: false, motivo: 'jugada_invalida' };
      }
      const objId = de.objeto;
      const viajeros = estado.viajeros.map((v) => {
        if (v.id === de.id) {
          const { objeto, ...vSinObjeto } = v;
          return vSinObjeto as Viajero;
        }
        if (v.id === a.id) return { ...v, objeto: objId };
        return v;
      });
      const objetos = estado.objetos.map((o) =>
        o.id === objId ? { ...o, portador: a.id } : o
      );
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros, objetos },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'vencio_fase') {
      const ventana = ventanaDecidirMs(estado.noche);
      const nocheActual = {
        ...estado.nocheActual!,
        venceEn: ahora + ventana,
      };
      return {
        ok: true,
        transicion: {
          estado: { ...estado, fase: 'decidir', nocheActual },
          efectos: [
            { t: 'agendar', enMs: ventana },
            { t: 'publicar', a: 'todos' },
          ],
        },
      };
    }
    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // decidir -> resolver
  if (estado.fase === 'decidir') {
    if (comando.t === 'responder_trato' && comando.jugador === estado.tratoOfrecidoA) {
      const viajeros = estado.viajeros.map((v) =>
        v.id === comando.jugador ? { ...v, aceptoElTrato: comando.acepta } : v
      );
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'elegir') {
      const boletaExistente = estado.nocheActual?.boletas[comando.jugador];
      if (boletaExistente && boletaExistente.bloqueadaEn > 0) {
        return { ok: false, motivo: 'jugada_invalida' };
      }
      const candidatos = estado.nocheActual!.candidatos;
      const ruta = comando.ruta ?? boletaExistente?.ruta ?? candidatos[0]!.id;
      const raciones = comando.raciones ?? boletaExistente?.raciones ?? 'normal';
      const esfuerzo = comando.esfuerzo ?? boletaExistente?.esfuerzo ?? [];

      const boleta: Boleta = {
        ruta,
        raciones,
        esfuerzo,
        bloqueadaEn: 0,
      };

      const boletas = {
        ...estado.nocheActual!.boletas,
        [comando.jugador]: boleta,
      };

      const nocheActual = {
        ...estado.nocheActual!,
        boletas,
      };

      return {
        ok: true,
        transicion: {
          estado: { ...estado, nocheActual },
          efectos: [{ t: 'publicar', a: { jugador: comando.jugador } }],
        },
      };
    }

    if (comando.t === 'bloquear') {
      const boleta = estado.nocheActual?.boletas[comando.jugador];
      const candidatos = estado.nocheActual!.candidatos;
      const nuevaBoleta: Boleta = {
        ruta: boleta?.ruta ?? candidatos[0]!.id,
        raciones: boleta?.raciones ?? 'normal',
        esfuerzo: boleta?.esfuerzo ?? [],
        bloqueadaEn: ahora,
      };

      const boletas = {
        ...estado.nocheActual!.boletas,
        [comando.jugador]: nuevaBoleta,
      };

      const nocheActual = {
        ...estado.nocheActual!,
        boletas,
      };

      const nuevoEstado = { ...estado, nocheActual };

      // Si todos bloquearon, resolver inmediatamente
      const boletasActuales = nuevoEstado.nocheActual?.boletas as Record<JugadorId, Boleta> | undefined;
      const todosBloquearon = nuevoEstado.viajeros.every(
        (v) => (boletasActuales?.[v.id]?.bloqueadaEn ?? 0) > 0
      );

      if (todosBloquearon) {
        return resolverNoche(nuevoEstado, ahora, false);
      }

      return {
        ok: true,
        transicion: {
          estado: nuevoEstado,
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'vencio_fase') {
      return resolverNoche(estado, ahora, true);
    }

    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // resolver -> fogon o epilogo
  if (estado.fase === 'resolver') {
    if (comando.t === 'vencio_fase' || comando.t === 'relato_listo') {
      // Aplicar el relato si llegó a tiempo
      let cronica = [...estado.cronica];
      if (comando.t === 'relato_listo' && cronica.length > 0) {
        const ultIndex = cronica.length - 1;
        const ult = cronica[ultIndex]!;
        cronica[ultIndex] = {
          ...ult,
          relato: comando.resultado.texto,
          origen: comando.resultado.origen,
        };
      }

      // Evaluar si terminó la partida
      const tablero = obtenerTablero(estado.tablero);
      const terminada =
        estado.avance >= estado.distanciaTotal ||
        estado.noche >= estado.nochesTotales ||
        (estado.recurso === 0 && estado.viajeros.every((v) => v.vigor === 0));

      if (terminada) {
        // Ir a epílogo
        const llegaron = estado.avance >= estado.distanciaTotal;
        const objetivosCumplidos: JugadorId[] = [];

        // Evaluar objetivos secretos
        for (const v of estado.viajeros) {
          const obj = tablero.objetivos.find((o) => o.id === v.objetivo);
          if (obj) {
            let cumplido = false;
            switch (obj.id) {
              case 'llegar-entero':
                // Check if current vigor > 0
                cumplido = v.vigor > 0;
                break;
              case 'que-nadie-quede':
                cumplido = estado.viajeros.every((x) => x.vigor > 0);
                break;
              case 'sobre-raciones':
                cumplido = estado.recurso >= (estado.tablero === 'el-salitral' ? 6 : 5);
                break;
              case 'el-perro-llega':
                cumplido = estado.perro.presente;
                break;
              case 'mano-propia': {
                // Contar cuántas veces estuvo en esfuerzo leyendo la crónica
                const miNombre = v.nombre;
                const recuentos: Record<string, number> = {};
                estado.viajeros.forEach((x) => {
                  recuentos[x.nombre] = 0;
                });
                for (const entry of estado.cronica) {
                  const esfuerzoFact = entry.hechos.find((h) => h.startsWith('esfuerzo:'));
                  if (esfuerzoFact) {
                    const nombres = esfuerzoFact.substring(9).split(',').map((x) => x.trim());
                    nombres.forEach((nombre) => {
                      if (nombre in recuentos) {
                        recuentos[nombre] = (recuentos[nombre] || 0) + 1;
                      }
                    });
                  }
                }
                const misNoches = recuentos[miNombre] || 0;
                const maxOtros = Math.max(
                  ...estado.viajeros
                    .filter((x) => x.id !== v.id)
                    .map((x) => recuentos[x.nombre] || 0)
                );
                cumplido = misNoches > maxOtros;
                break;
              }
              case 'nunca-el-atajo': {
                // Chequear si se eligió tramo de dureza alta o atajo
                let atajoElegido = false;
                for (const entry of estado.cronica) {
                  const tramoFact = entry.hechos.find((h) => h.startsWith('tramo:'));
                  if (tramoFact) {
                    const trName = tramoFact.substring(6);
                    const trObj = tablero.tramos.find((x) => x.nombre === trName);
                    if (trObj && trObj.costoRecurso >= 2) {
                      atajoElegido = true;
                    }
                  }
                }
                cumplido = !atajoElegido;
                break;
              }
              case 'ver-el-final':
                cumplido = llegaron;
                break;
              case 'sin-carga': {
                // Nunca portador de objeto
                let cargoObjeto = false;
                for (const entry of estado.cronica) {
                  const objFact = entry.hechos.find((h) => h.includes(`portador:${v.nombre}`));
                  if (objFact) {
                    cargoObjeto = true;
                  }
                }
                cumplido = !cargoObjeto;
                break;
              }
              default:
                cumplido = llegaron;
            }
            if (cumplido) objetivosCumplidos.push(v.id);
          }
        }

        const desenlace = {
          llegaron,
          objetivosCumplidos,
          perroLlego: estado.perro.presente,
        };

        const { nocheActual, ...estadoSinNocheActual } = estado;

        return {
          ok: true,
          transicion: {
            estado: { ...estadoSinNocheActual, fase: 'epilogo', cronica, desenlace } as any,
            efectos: [{ t: 'publicar', a: 'todos' }],
          },
        };
      }

      // Ir a fogón
      return {
        ok: true,
        transicion: {
          estado: { ...estado, fase: 'fogon', cronica },
          efectos: [
            { t: 'agendar', enMs: TIEMPOS.fogonMs },
            { t: 'publicar', a: 'todos' },
          ],
        },
      };
    }
    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // fogon -> acampar o epilogo
  if (estado.fase === 'fogon') {
    if (comando.t === 'entregar_objeto') {
      const de = estado.viajeros.find((v) => v.id === comando.de);
      const a = estado.viajeros.find((v) => v.id === comando.a);
      if (!de || !a || !de.objeto || a.objeto) {
        return { ok: false, motivo: 'jugada_invalida' };
      }
      const objId = de.objeto;
      const viajeros = estado.viajeros.map((v) => {
        if (v.id === de.id) {
          const { objeto, ...vSinObjeto } = v;
          return vSinObjeto as Viajero;
        }
        if (v.id === a.id) return { ...v, objeto: objId };
        return v;
      });
      const objetos = estado.objetos.map((o) =>
        o.id === objId ? { ...o, portador: a.id } : o
      );
      return {
        ok: true,
        transicion: {
          estado: { ...estado, viajeros, objetos },
          efectos: [{ t: 'publicar', a: 'todos' }],
        },
      };
    }

    if (comando.t === 'vencio_fase' || comando.t === 'relato_listo') {
      // Avanzar noche
      const siguienteNoche = estado.noche + 1;
      const rng = crearRng(estado.semilla + '-noche-' + siguienteNoche);
      const tablero = obtenerTablero(estado.tablero);

      // Elegir candidatos
      const count = siguienteNoche === 1 ? 2 : 3;
      const tramosBarajados = rng.barajar(tablero.tramos);
      const candidatos = tramosBarajados.slice(0, count) as any as Tramo[];

      // Calcular alerta del perro para la noche siguiente
      const durezaMax = Math.max(...candidatos.map((c) => c.dureza));
      const alertas: ('ninguna' | 'inquieto' | 'grune' | 'no_avanza')[] = [
        'ninguna',
        'inquieto',
        'grune',
        'no_avanza',
      ];
      const alertaCorrecta = alertas[durezaMax]!;
      let alerta = alertaCorrecta;
      let diceVerdad = true;
      if (rng.suerte(PERRO_MIENTE)) {
        const alternativas = alertas.filter((a) => a !== alertaCorrecta);
        alerta = rng.elegir(alternativas);
        diceVerdad = false;
      }

      // Trato: noches 2 a 4
      let tratoOfrecidoA = estado.tratoOfrecidoA;
      // Probabilidad de trato si no se ha ofrecido y estamos en la ventana
      if (
        tratoOfrecidoA === undefined &&
        siguienteNoche >= 2 &&
        siguienteNoche <= 4
      ) {
        // Probabilidad de ofrecer el trato (equivalente a 75% en toda la travesía)
        const chance = siguienteNoche === 2 ? 0.25 : siguienteNoche === 3 ? 0.33 : 0.5;
        if (rng.suerte(chance)) {
          // Evaluar viajero con mayor retraso en objetivo
          let maxScore = -1;
          let viajerosCandidatos: Viajero[] = [];
          for (const v of estado.viajeros) {
            let score = 3 - v.vigor; // por default
            if (v.objetivo === 'mano-propia') {
              // contar de crónica
              let countEffort = 0;
              for (const entry of estado.cronica) {
                const fact = entry.hechos.find((h) => h.startsWith('esfuerzo:'));
                if (fact && fact.substring(9).includes(v.nombre)) {
                  countEffort++;
                }
              }
              score = 5 - countEffort;
            }
            if (score > maxScore) {
              maxScore = score;
              viajerosCandidatos = [v];
            } else if (score === maxScore) {
              viajerosCandidatos.push(v);
            }
          }
          if (viajerosCandidatos.length > 0) {
            const elegido = rng.elegir(viajerosCandidatos);
            tratoOfrecidoA = elegido.id;
          }
        }
      }

      // Ceguera: noches 3 y 4
      const viajeros = estado.viajeros.map((v) => ({ ...v, cegado: false }));
      if (siguienteNoche === 3 || siguienteNoche === 4) {
        const rolesEnJuego = Array.from(new Set(estado.viajeros.map((v) => v.rol)));
        const rolesCegadosPrevios: Rol[] = [];
        for (const entry of estado.cronica) {
          const fact = entry.hechos.find((h) => h.startsWith('cegado:'));
          if (fact) {
            rolesCegadosPrevios.push(fact.substring(7) as Rol);
          }
        }
        const candidatosCeguera = rolesEnJuego.filter(
          (r) => !rolesCegadosPrevios.includes(r)
        );
        const rolCegado = rng.elegir(
          candidatosCeguera.length > 0 ? candidatosCeguera : rolesEnJuego
        );
        viajeros.forEach((v) => {
          if (v.rol === rolCegado) {
            v.cegado = true;
          }
        });
      }

      const nocheActual: EstadoNoche = {
        numero: siguienteNoche,
        candidatos,
        boletas: {},
        venceEn: ahora + TIEMPOS.acamparMs,
      };

      const nuevoEstado: EstadoPartida = {
        ...estado,
        fase: 'acampar',
        noche: siguienteNoche,
        viajeros,
        nocheActual,
        perro: {
          presente: estado.perro.presente,
          alerta,
          dice_la_verdad: diceVerdad,
        },
        ...(tratoOfrecidoA !== undefined ? { tratoOfrecidoA } : {}),
      };

      return {
        ok: true,
        transicion: {
          estado: nuevoEstado,
          efectos: [
            { t: 'agendar', enMs: TIEMPOS.acamparMs },
            { t: 'publicar', a: 'todos' },
          ],
        },
      };
    }
    return { ok: false, motivo: 'fuera_de_fase' };
  }

  // epilogo -> fin
  if (estado.fase === 'epilogo') {
    if (comando.t === 'vencio_fase') {
      return {
        ok: true,
        transicion: {
          estado,
          efectos: [{ t: 'terminar' }],
        },
      };
    }
    return { ok: false, motivo: 'fuera_de_fase' };
  }

  return { ok: false, motivo: 'jugada_invalida' };
}

function resolverNoche(
  estado: EstadoPartida,
  ahora: number,
  porTimeout: boolean
): Resultado {
  const rng = crearRng(estado.semilla + '-resolucion-noche-' + estado.noche);
  const tablero = obtenerTablero(estado.tablero);
  const candidatos = estado.nocheActual!.candidatos;

  // Autocompletar boletas ausentes
  const boletas: Record<JugadorId, Boleta> = { ...estado.nocheActual!.boletas };
  for (const v of estado.viajeros) {
    let b = boletas[v.id];
    if (!b || b.bloqueadaEn === 0) {
      // Es ausente
      let ruta = b?.ruta;
      let raciones = b?.raciones;
      let esfuerzo = b?.esfuerzo ?? [];

      // Si no eligió ruta/raciones, votar por mayoría del resto
      if (!ruta) {
        const votosRuta: Record<string, number> = {};
        candidatos.forEach((c) => {
          votosRuta[c.id] = 0;
        });
        Object.values(boletas).forEach((x) => {
          if (x.bloqueadaEn > 0 && x.ruta) votosRuta[x.ruta] = (votosRuta[x.ruta] || 0) + 1;
        });
        let maxVotos = -1;
        let rutaGanadora = candidatos[0]!.id;
        candidatos.forEach((c) => {
          if ((votosRuta[c.id] || 0) > maxVotos) {
            maxVotos = votosRuta[c.id] || 0;
            rutaGanadora = c.id as TramoId;
          }
        });
        ruta = rutaGanadora;
      }

      if (!raciones) {
        const votosRac: Record<string, number> = { ajustado: 0, normal: 0, abundante: 0 };
        Object.values(boletas).forEach((x) => {
          if (x.bloqueadaEn > 0 && x.raciones) {
            votosRac[x.raciones] = (votosRac[x.raciones] || 0) + 1;
          }
        });
        let maxVotos = -1;
        let racGanadora: NivelRaciones = 'normal';
        (['ajustado', 'normal', 'abundante'] as NivelRaciones[]).forEach((r) => {
          if ((votosRac[r] || 0) > maxVotos) {
            maxVotos = votosRac[r] || 0;
            racGanadora = r;
          }
        });
        raciones = racGanadora;
      }

      // Esfuerzo ausente es siempre vacio
      esfuerzo = [];

      boletas[v.id] = {
        ruta,
        raciones,
        esfuerzo,
        bloqueadaEn: ahora,
      };
    }
  }

  // 1. Conteo de boletas
  const capataz = estado.viajeros.find((v) => v.rol === 'capataz');

  // Ruta
  let decisionRuta: TramoId = candidatos[0]!.id as TramoId;
  let viaRuta: any = 'mayoria';

  if (estado.noche === 5 && capataz) {
    // Noche 5: Capataz decide solo, salvo que TODOS los demás voten lo mismo y distinto a él
    const votoCapataz = boletas[capataz.id]?.ruta ?? (candidatos[0]!.id as TramoId);
    const otrosVotos = estado.viajeros
      .filter((v) => v.id !== capataz.id)
      .map((v) => boletas[v.id]?.ruta);

    const primerOtro = otrosVotos[0];
    const todosIguales = otrosVotos.every((v) => v === primerOtro && v !== undefined);

    if (todosIguales && primerOtro !== votoCapataz) {
      decisionRuta = primerOtro as TramoId;
      viaRuta = 'oposicion_unanime';
    } else {
      decisionRuta = votoCapataz;
      viaRuta = 'capataz_solo';
    }
  } else {
    // Mayoría simple
    const votosRuta: Record<string, number> = {};
    candidatos.forEach((c) => {
      votosRuta[c.id] = 0;
    });
    estado.viajeros.forEach((v) => {
      const r = boletas[v.id]?.ruta;
      if (r) votosRuta[r] = (votosRuta[r] || 0) + 1;
    });

    let maxVotos = -1;
    let candidatasGanadoras: TramoId[] = [];
    candidatos.forEach((c) => {
      const v = votosRuta[c.id] || 0;
      if (v > maxVotos) {
        maxVotos = v;
        candidatasGanadoras = [c.id as TramoId];
      } else if (v === maxVotos) {
        candidatasGanadoras.push(c.id as TramoId);
      }
    });

    if (candidatasGanadoras.length === 1) {
      decisionRuta = candidatasGanadoras[0]!;
      viaRuta = porTimeout ? 'vencio_el_tiempo' : 'mayoria';
    } else {
      // Empate: decide Capataz
      const votoCapataz = capataz ? boletas[capataz.id]?.ruta : undefined;
      if (votoCapataz && candidatasGanadoras.includes(votoCapataz as TramoId)) {
        decisionRuta = votoCapataz as TramoId;
        viaRuta = 'desempate_capataz';
      } else {
        decisionRuta = rng.elegir(candidatasGanadoras);
        viaRuta = 'mayoria'; // fallback
      }
    }
  }

  // Raciones
  let decisionRaciones: NivelRaciones = 'normal';
  const votosRaciones: Record<NivelRaciones, number> = { ajustado: 0, normal: 0, abundante: 0 };
  estado.viajeros.forEach((v) => {
    const r = boletas[v.id]?.raciones;
    if (r) votosRaciones[r]++;
  });

  let maxVotosRac = -1;
  let racionesGanadoras: NivelRaciones[] = [];
  (['ajustado', 'normal', 'abundante'] as NivelRaciones[]).forEach((r) => {
    const v = votosRaciones[r];
    if (v > maxVotosRac) {
      maxVotosRac = v;
      racionesGanadoras = [r];
    } else if (v === maxVotosRac) {
      racionesGanadoras.push(r);
    }
  });

  if (racionesGanadoras.length === 1) {
    decisionRaciones = racionesGanadoras[0]!;
  } else {
    const votoCapataz = capataz ? boletas[capataz.id]?.raciones : undefined;
    if (votoCapataz && racionesGanadoras.includes(votoCapataz)) {
      decisionRaciones = votoCapataz;
    } else {
      decisionRaciones = 'normal';
    }
  }

  // Esfuerzo
  // Contamos votos por viajero
  const votosEsfuerzo: Record<JugadorId, number> = {};
  estado.viajeros.forEach((v) => {
    votosEsfuerzo[v.id] = 0;
  });
  estado.viajeros.forEach((v) => {
    const e = boletas[v.id]?.esfuerzo ?? [];
    e.forEach((id) => {
      votosEsfuerzo[id as JugadorId] = (votosEsfuerzo[id as JugadorId] || 0) + 1;
    });
  });

  // Filtrar viajeros con vigor > 0
  const viajerosConVigor = estado.viajeros.filter((v) => v.vigor > 0);
  // Ordenar por votos desc
  const ordenados = [...viajerosConVigor].sort(
    (a, b) => (votosEsfuerzo[b.id] || 0) - (votosEsfuerzo[a.id] || 0)
  );

  const decisionEsfuerzo = ordenados.slice(0, 3).map((v) => v.id);

  // 12 pasos de resolución
  // 1. Se fija la ruta
  const tramoElegido = candidatesFind(candidatos, decisionRuta) || candidatos[0]!;

  // 2. Avance
  let avanceNoche = AVANCE.base + decisionEsfuerzo.length * AVANCE.porEsfuerzo - tramoElegido.dureza;
  avanceNoche = Math.max(0, avanceNoche);
  const nuevoAvance = estado.avance + avanceNoche;

  // 3. Consumo
  const viajerosActivos = estado.viajeros.length;
  let consumo = viajerosActivos * RACIONES.consumoPorViajero[decisionRaciones] + tramoElegido.costoRecurso;
  consumo = Math.max(0, consumo);

  // Objeto 'bordalesa' en El Salitral suma 8 a capacidad
  let capacidad = estado.capacidad;
  if (estado.objetos.some((o) => o.arquetipo === 'bordalesa')) {
    capacidad = 38; // 30 + 8
  }

  // Objeto 'yunque-de-mano' aumenta la carga y ocupa 5 de capacidad de raciones
  if (estado.objetos.some((o) => o.arquetipo === 'yunque-de-mano')) {
    capacidad = Math.max(0, capacidad - 5);
  }

  const recursoEfectivo = Math.min(estado.recurso, consumo);
  const nuevoRecurso = Math.max(0, Math.min(capacidad, estado.recurso - consumo));

  const viajerosModificados = estado.viajeros.map((v) => ({ ...v }));

  // 4. Vigor por esfuerzo
  // Objeto 'yunque-de-mano': el trabajo pesado cuesta 1 de vigor menos
  const tieneYunque = estado.objetos.some((o) => o.arquetipo === 'yunque-de-mano');
  // Objeto 'bordalesa': el trabajo pesado cuesta 1 de vigor más
  const tieneBordalesa = estado.objetos.some((o) => o.arquetipo === 'bordalesa');

  decisionEsfuerzo.forEach((id) => {
    const v = viajerosModificados.find((x) => x.id === id);
    if (v) {
      let costo: number = AVANCE.costoEsfuerzoVigor;
      if (tieneYunque) costo = Math.max(0, costo - 1);
      if (tieneBordalesa) costo += 1;
      v.vigor = Math.max(0, v.vigor - costo) as Vigor;
    }
  });

  // 5. Vigor por raciones
  viajerosModificados.forEach((v) => {
    const delta = RACIONES.efectoVigor[decisionRaciones];
    v.vigor = Math.max(0, Math.min(VIGOR_MAX, v.vigor + delta)) as Vigor;
  });

  // 6. Hambre
  const pagoIncompleto = recursoEfectivo < consumo;
  if (pagoIncompleto) {
    viajerosModificados.forEach((v) => {
      v.vigor = Math.max(0, v.vigor - 1) as Vigor;
    });
  }

  // 7. Objetos activos
  // Manta de lana: el portador pasa 1 de vigor a otro
  const mantaObj = estado.objetos.find((o) => o.arquetipo === 'manta-de-lana');
  if (mantaObj && mantaObj.portador) {
    const portador = viajerosModificados.find((x) => x.id === mantaObj.portador);
    const masDebil = [...viajerosModificados]
      .filter((x) => x.id !== portador?.id)
      .sort((a, b) => a.vigor - b.vigor)[0];

    if (portador && portador.vigor >= 2 && masDebil && masDebil.vigor <= 1) {
      portador.vigor = (portador.vigor - 1) as Vigor;
      masDebil.vigor = Math.min(3, masDebil.vigor + 1) as Vigor;
    }
  }

  // Aguardiente: restaura 1 de vigor a todos; en la noche 5 todos pierden 1
  const tieneAguardiente = estado.objetos.some((o) => o.arquetipo === 'aguardiente');
  if (tieneAguardiente && estado.noche < 5) {
    viajerosModificados.forEach((v) => {
      v.vigor = Math.min(3, v.vigor + 1) as Vigor;
    });
  }
  if (estado.noche === 5) {
    // Si alguna vez se usó aguardiente, se cobra en la noche 5
    // En la noche 5 todos pierden 1
    const seUsoAguardiente = estado.cronica.some((entry) =>
      entry.hechos.some((h) => h.includes('objeto:aguardiente'))
    );
    if (seUsoAguardiente || tieneAguardiente) {
      viajerosModificados.forEach((v) => {
        v.vigor = Math.max(0, v.vigor - 1) as Vigor;
      });
    }
  }

  // 8. Hallazgo
  let nuevosObjetos = [...estado.objetos];
  const hallo = rng.suerte(tramoElegido.hallazgo);
  if (hallo && nuevosObjetos.length < 4) {
    const arquetiposDisponibles = tablero.mazoObjetos.filter(
      (arc) => !nuevosObjetos.some((o) => o.arquetipo === arc.id)
    );
    if (arquetiposDisponibles.length > 0) {
      const arc = rng.elegir(arquetiposDisponibles);
      const portadoresCandidatos = viajerosModificados.filter((v) => v.objeto === undefined);
      if (portadoresCandidatos.length > 0) {
        const portador = rng.elegir(portadoresCandidatos);
        const objId = objetoId(rng.entero(1000, 9999).toString());
        const nuevoObj = {
          id: objId,
          arquetipo: arc.id,
          portador: portador.id,
          usosRestantes: arc.usos,
          identificado: false,
        };
        nuevosObjetos.push(nuevoObj);
        portador.objeto = objId;
      }
    }
  }

  // 9. Degradación de objetos
  nuevosObjetos.forEach((o) => {
    o.usosRestantes--;
  });
  // Filtrar de viajeros los que se cayeron
  nuevosObjetos = nuevosObjetos.filter((o) => {
    if (o.usosRestantes <= 0) {
      const v = viajerosModificados.find((x) => x.id === o.portador);
      if (v) {
        delete v.objeto;
      }
      return false;
    }
    return true;
  });

  // 10. Perro
  let perroPresente = estado.perro.presente;
  if (decisionEsfuerzo.includes('perro' as any)) {
    perroPresente = false;
  }

  // 11. Trato privado
  if (estado.noche === 5 && estado.tratoOfrecidoA) {
    const target = viajerosModificados.find((x) => x.id === estado.tratoOfrecidoA);
    if (target && target.aceptoElTrato) {
      viajerosModificados.forEach((v) => {
        if (v.id !== target.id) {
          v.vigor = Math.max(0, v.vigor - 1) as Vigor;
        }
      });
    }
  }

  // Registrar hechos
  const hechos: string[] = [];
  hechos.push(`tramo:${tramoElegido.nombre}`);
  hechos.push(`avance:${avanceNoche}`);
  hechos.push(`recurso:${recursoEfectivo}`);
  if (pagoIncompleto) hechos.push('hambre');
  if (decisionEsfuerzo.length > 0) {
    const nombresEsfuerzo = decisionEsfuerzo
      .map((id) => viajerosModificados.find((x) => x.id === id)?.nombre ?? '')
      .filter(Boolean);
    hechos.push(`esfuerzo:${nombresEsfuerzo.join(',')}`);
  }
  viajerosModificados.forEach((v) => {
    const prevV = estado.viajeros.find((x) => x.id === v.id);
    if (v.vigor === 0 && (prevV?.vigor ?? 0) > 0) {
      hechos.push(`quiebre:${v.nombre}`);
    }
  });

  // Si alguien quedó ciego esta noche, registrarlo
  const cegado = viajerosModificados.find((v) => v.cegado);
  if (cegado) {
    hechos.push(`cegado:${cegado.rol}`);
  }

  // Si hubo trato esta noche, registrarlo
  if (estado.tratoOfrecidoA && estado.nocheActual) {
    const target = viajerosModificados.find((x) => x.id === estado.tratoOfrecidoA);
    if (target && target.aceptoElTrato) {
      hechos.push(`trato_aceptado:${target.nombre}`);
    }
  }

  // Registrar objetos encontrados
  nuevosObjetos.forEach((o) => {
    if (!estado.objetos.some((x) => x.id === o.id)) {
      const portadorNombre = viajerosModificados.find((x) => x.id === o.portador)?.nombre ?? '';
      hechos.push(`objeto:${o.arquetipo},portador:${portadorNombre}`);
    }
  });

  // Construir entrada de crónica
  const relatoRespaldo = tablero.respaldos['resolucion']
    ? rng.elegir(tablero.respaldos['resolucion'])
    : 'Avanzamos un tramo en la penumbra.';

  const nuevaCronica: EntradaCronica = {
    noche: estado.noche,
    hechos,
    relato: relatoRespaldo,
    origen: 'respaldo',
  };

  const nuevoEstado: EstadoPartida = {
    ...estado,
    fase: 'resolver',
    avance: nuevoAvance,
    recurso: nuevoRecurso,
    viajeros: viajerosModificados,
    objetos: nuevosObjetos,
    cronica: [...estado.cronica, nuevaCronica],
    perro: { ...estado.perro, presente: perroPresente },
  };

  // Efecto LLM
  const pedido: PedidoRelato = {
    escena: 'resolucion',
    voz: tablero.vozDelCamino,
    hechos,
    menu: [],
    limitePalabras: 25,
    fondos: tablero.fondos,
  };

  return {
    ok: true,
    transicion: {
      estado: nuevoEstado,
      efectos: [
        { t: 'pedir_relato', pedido },
        { t: 'agendar', enMs: TIEMPOS.resolverMs },
        { t: 'publicar', a: 'todos' },
      ],
    },
  };
}

function candidatesFind(candidates: any[], id: string) {
  return candidates.find((c) => c.id === id);
}
