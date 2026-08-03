# 10 · Roadmap

Cada hito tiene un criterio de salida que se puede verificar, no una sensación. Y
cada uno termina en algo que se puede probar con gente.

## M0 · Estructura ✅

Monorepo, tipos, protocolo, tableros, lobby funcionando.

**Criterio**: `pnpm -r typecheck` pasa, el servidor levanta, dos celulares entran a
una sala y la TV los muestra. ✅

## M1 · El motor, en una terminal

`reducir()` implementado para una travesía completa. Sin red, sin UI, sin modelo.

- Conteo de boletas con sus cuatro vías de resolución
- Los doce pasos del orden de resolución ([03](03-reglas-de-resolucion.md))
- El perro, el trato, los objetos, la ceguera, la noche 5
- Un runner de terminal que juega una travesía con boletas por stdin

**Criterio de salida**: se juega una travesía entera en la terminal y **el loop de
una noche es interesante sin animaciones**. Si no lo es, no se sigue: no lo va a
salvar ninguna cutscene. Es el único hito que puede terminar en "volver al diseño".

## M2 · La partida por red

El motor conectado a las salas. Vistas proyectadas por rol, timers de fase,
reconexión.

**Criterio**: cinco personas juegan las cinco noches desde sus celulares con la TV
en una laptop. La TV puede ser fea; nadie puede quedarse esperando.

## M3 · La TV que se mira

Escena de fogata, la llama como reloj, la cutscene de 7 segundos, el perro, los
tres niveles de animación.

**Criterio**: la mesa mira la TV en la resolución sin que nadie les diga. Si siguen
mirando el celular durante la cutscene, la cutscene está mal.

## M4 · El modelo

Llamada real, presupuesto de tiempo, respaldos, las cinco escenas.

**Criterio**: cortás la red en el medio de una partida y **la mesa no se entera**.
Ese es el test, no la calidad de la prosa.

## M5 · Que se pueda jugar sin vos

Deploy ([12](12-deploy.md)), receiver de Cast, votación de tablero, epílogo con
crónica compartible.

**Criterio**: un grupo que no conocés juega una travesía entera sin ayuda, y
**vuelve a jugar otra**. Lo segundo es lo que importa: es lo único que justifica
empezar a pensar en apps nativas (`D13`).

## Lo que no entra al MVP

`D15`: cada sistema nuevo es una regla más que explicar. El techo no es cuánto se le
puede meter, es cuánto puede sostener una conversación de cinco personas sin que
alguien mire el celular.

| Descartado del MVP | Por qué |
|---|---|
| Economía, crafteo, progresión de habilidades | Reglas que explicar sin nada que agreguen a la charla |
| Cuentas de usuario | Un nombre por partida alcanza |
| Salas públicas / matchmaking | Este juego es para gente en el mismo living |
| Apps nativas de TV | El costo no es el código: es el impuesto de certificaciones y QA (`D13`) |
| Más de dos tableros | Dos ya obligan a abstraer bien, que era el punto (`D12`) |
| La versión de 7 noches | Queda como tablero desbloqueable (`D7`) |
| Chat, historial, sonido en el celular | La conversación es el juego (`D1`) |

## El orden importa

M1 antes que M2 antes que M3 no es burocracia: **es el orden que hace que un juego
malo se descubra barato.** Si la TV se construye primero, el sesgo de haber hecho
la animación linda impide ver que la noche no es interesante.
