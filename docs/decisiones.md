# Decisiones

Por qué las cosas son como son. Una entrada por decisión, con lo que se descartó.
Si en tres meses querés cambiar algo de acá, leé primero la justificación.

---

### D1 — La conversación es el juego

El dispositivo y la IA son el plus. Ningún jugador toca el celular más de 10 segundos por ronda.

**Descartado**: mecánicas donde se escribe o se dibuja en el celular (impostor por texto,
dibujo adversarial, historia colectiva). Todas producen un minuto de gente tipeando en silencio,
que es exactamente lo que este juego no quiere ser.

---

### D2 — Cooperativo con objetivos divergentes, no con traidor

Nadie juega contra el grupo. Cada uno lleva un objetivo personal secreto que roza los de los
demás. En familia funciona mucho mejor que la paranoia pura.

**Matiz posterior (D9)**: se recuperó una traición posible, pero acotada.

---

### D3 — La fogata es el reloj

No hay barra de progreso ni contador. La llama se consume, el halo se achica y la luz sobre
los viajeros baja con ella. Dígitos solo en los últimos 30 segundos.

Es información, atmósfera y presión en un solo elemento. Es el elemento firma del tablero.

---

### D4 — El estado vive en el servidor, la TV es un renderer tonto

Las animaciones se disparan por transición de estado, nunca por lógica del cliente.

Reconectar se vuelve trivial, y una app nativa de TV más adelante es una carcasa alrededor
del mismo cliente web en vez de un port del juego.

---

### D5 — El LLM no lleva el estado

Motor determinista para reglas, recursos y resolución. El modelo elige de un **menú de jugadas
válidas** que le arma el motor y escribe la piel: personalidad, relato, negociación, crónica.

Un modelo que lleva el estado alucina, se olvida de sus propias reglas y termina haciendo trampa
sin querer. Es la forma más rápida de que un grupo abandone la partida.

---

### D6 — La llamada al modelo se dispara al empezar la animación

La cutscene de 7 segundos existe también para esconder la latencia. Si el relato no llegó,
hay un texto de respaldo por escenario.

---

### D7 — 5 noches, no 7

Siete era una noche de juego de mesa. Cinco es una sobremesa: ~25 minutos.
La versión de 7 queda como tablero desbloqueable.

---

### D8 — El tutorial no existe: el celular da la línea

En la noche 1 se decide una sola cosa y el celular no ofrece opciones, dicta qué decir en
voz alta. Las habilidades se abren de a una hasta la noche 3.

Nadie lee reglas nunca. Si al primer minuto no están jugando, se perdió la mesa.

---

### D9 — El trato vuelve, acotado

Una oferta privada por travesía, a un solo jugador o a ninguno — lo decide el motor.
Nunca hace perder a nadie: cambia el final y la crónica, no el resultado.

Que "ninguno" sea posible es lo que hace que la sospecha salga gratis.

---

### D10 — El perro avisa, no obedece

Nadie lo controla. Es el único dato **público** del juego y miente ~1 de cada 5 veces.
Se lo puede perder.

**Descartado**: mascota controlable o decorativa. Una calcomanía que hay que animar y no
aporta nada a la mesa.

---

### D11 — Los objetos se reparten, no se recogen

Solo una persona puede cargarlo. Si cualquiera lo agarra con un toque, es inventario silencioso.

Máximo 3–4 activos y todos se degradan: sin costo de guardar, todo grupo acumula.

---

### D12 — Un tablero cambia una regla, no solo la piel

Si son paisajes con el mismo juego adentro, se prueban todos en una noche y no se vuelve.
Dos tableros en el MVP: uno solo no obliga a abstraer bien.

---

### D13 — Web primero; Cast antes que app nativa

Un receiver de Google Cast **es** una web app: el build actual corre casi sin tocar nada y
elimina el "cómo lo pongo en la tele" sin tienda ni certificación.

Las apps nativas (Android TV / Fire TV primero, Tizen y webOS después, tvOS y Roku last)
solo cuando haya señal de que los grupos vuelven a jugar. El costo real no es el código: es
el impuesto permanente de certificaciones, QA en aparatos y políticas que cambian solas.

---

### D14 — Máximo 10 jugadores

El límite no es técnico, es de aire para hablar. Más de 10 y siempre hay alguien que dejó
de importar y se puso a mirar el teléfono.

---

### D15 — No se agrega economía, crafteo ni progresión de habilidades

Cada sistema nuevo es una regla más que explicar. El techo no es cuánto se le puede meter:
es cuánto puede sostener una conversación de cinco personas sin que alguien mire el celular.

---

### D16 — Vite y un proceso Node propio, no un framework de páginas

Estos juegos no tienen páginas: tienen un socket abierto durante 25 minutos y estado
mutable en memoria. Routing, SSR, SEO y data fetching por request —que es lo que un
framework de páginas resuelve bien— no aplican a nada de esto.

**Descartado Next.js**: no sirve WebSockets (los route handlers no hacen protocol
upgrade), así que igual habría que correr un proceso Node aparte; y su modelo de
despliegue es stateless, cuando acá una sala *es* estado que vive entre requests.
Terminás con la misma arquitectura de dos procesos, pagando Next en el medio. Vale
igual para SvelteKit y compañía: cambia la sintaxis, no el desajuste.

**Descartado Colyseus / Nakama**: traen matchmaking y sincronización por deltas, que
son el 80% de lo que no usamos, y su modelo pelea con D4 — acá se manda el estado
entero por transición, no parches por tick.

**Descartado, con ganas, Cloudflare Durable Objects**: un DO *es* una sala con
estado, y la hibernación de WebSockets está hecha para conexiones que pasan minutos
en silencio. Queda como la mejor opción si el hosting alguna vez tiene que ser
gratis y siempre disponible. No es hoy porque ata el servidor a un runtime que no es
Node y complica correr todo en una laptop, que es donde se prueba.

Corolario que se paga caro si se descubre tarde: **mientras el estado esté en
memoria, una sola instancia.** Dos réplicas detrás de un balanceador parten las salas
por la mitad sin dar ningún error visible.

---

### D17 — Un repo con varios juegos, una carpeta por juego

Un juego es una carpeta en `/juegos` con todo lo suyo adentro: reglas, datos, sus dos
clientes y sus docs. Lo común —el menú y el proceso que sirve todo— vive en `/apps`.

**Descartado agrupar por tipo** (`/apps/salvese-tv`, `/apps/otrojuego-tv`,
`/packages/salvese-core`…): con cuatro juegos son doce carpetas hermanas y hay que
leer el prefijo para saber qué va con qué. Agrupar por juego hace que agregar uno sea
agregar una carpeta, y que borrarlo sea borrarla.

**Descartado un motor genérico de party games.** Es la forma clásica de no terminar
ninguno: se abstrae sobre un solo caso y la abstracción sale mal. La única costura
compartida hoy es el registro de `apps/servidor/src/juegos.ts`, que es una lista. Lo
que resulte común va a ser evidente recién con el segundo juego funcionando.

**Un solo proceso y un solo hostname**, con los juegos colgando de rutas
(`/salvese`, `/salvese/control`). Un juego más no es infraestructura más. Si alguna
vez uno necesita su propio proceso —otro runtime, otra escala— ahí se le da el suyo.

---

### D18 — La boleta es secreta durante la noche y pública después

Se revela en el fogón, con nombre: quién votó qué en cada dimensión y cómo se
resolvió.

Sin esto, D1 ("la conversación es el juego") no se sostiene: se puede decir "voto
por el paso" y votar el río, y nadie se entera **nunca**. Tres minutos de discusión
donde mentir es gratis, indetectable e inútil a la vez. Revelar después convierte
cada frase dicha en un compromiso verificable, y le da a la anécdota (pilar 4) un
culpable con nombre en vez de una mayoría anónima.

De paso le da contenido propio al fogón, que era la peor falla del playtest de
M3.5, sin escribir una línea de contenido nuevo.

**Descartado revelarlas en vivo durante la ventana**: mata la tensión y convierte
la discusión en un tablero de votación. El valor está en el desfasaje — se habla a
ciegas, se paga después.

---

### D19 — El esfuerzo no se vota: lo reparte el Capataz

Cada noche el Capataz nombra solo a quién manda al trabajo pesado. No puede mandar
a la misma persona dos noches seguidas.

Es el pilar 3 —"toda decisión duele contra una persona"— que no estaba
implementado en ninguna parte: se votaba contra opciones abstractas. Y le da al
Capataz un trabajo **todas** las noches; hasta ahora existía solo en los empates y
en la noche 5, o sea casi nunca. Toda la mesa lo lobbea durante la ventana, que es
exactamente la conversación que el juego dice querer.

Crea además una dependencia entre dos personas concretas: el Capataz no ve el
vigor y la Curandera sí, así que la Curandera pasa a tener un interlocutor con
nombre en vez de "el grupo".

**Sin Capataz en la mesa** (2 y 3 jugadores, ver `REPARTO`) el esfuerzo es
voluntario: cada uno declara si se ofrece. Con esa cantidad de gente no hace falta
una autoridad.

**Descartado dejarlo como voto y solo arreglar el conteo** —que estaba roto: no
contaba votos, ordenaba por votos y se llevaba los tres primeros, tuvieran votos o
no. Arreglar eso corrige el bug y no corrige el juego.

---

### D20 — Se puede mentir con la habilidad, dos veces por travesía

El celular muestra lo que ves y pregunta qué reportás. Las opciones falsas son las
descripciones **reales de los otros tramos**, así que son indistinguibles y no hay
patrón que aprender.

La información oculta no era falsificable: se decía lo que se veía y nada
registraba si era cierto. Con esto la habilidad deja de ser un cable —entra dato,
sale dato— y pasa a ser una decisión. Recién acá la regla de que el vigor viaje
como texto y no como número tiene recompensa mecánica en vez de ser una
restricción sin nada del otro lado.

**El límite de dos es lo que sostiene el sistema.** Si mentir es gratis todos
mienten siempre y la información vale cero. Con dos, cada mentira es cara, la
información es mayormente cierta —vale la pena escuchar— y nunca segura —vale la
pena discutir.

**Matiza D2**: sigue sin haber traidor. Se shadea porque el objetivo propio lo
necesita, no porque se gane si el grupo pierde. Es el "gente con prioridades
distintas" que D2 prometió y que ninguna mecánica entregaba.

---

### D21 — El objetivo personal puede ganarse con la caravana perdida

Dos marcadores independientes en el epílogo: si llegaron, y si conseguiste lo tuyo.
Los cuatro cuadrantes son resultados válidos. Y los objetivos exigen **conducta
visible** durante toda la travesía, no una condición pasiva que se mide al final.

**Da vuelta D9** en su parte de goma: el trato ahora tiene un costo grupal real que
se cobra en la última noche.

Un objetivo que no puede hacerte perder ni obligarte a nada durante la partida es
un billete de lotería que se revela al final, no una tensión. Y la divergencia sin
fricción no es divergencia: el checklist de tableros ya pedía que "al menos dos
objetivos se estorben" y no se cumplía porque ninguno obligaba a nada.

Lo que **no** cambia de D9: que el trato pueda no ofrecerse a nadie. Que "ninguno"
sea posible es lo que hace que la sospecha salga gratis.

---

### D22 — La travesía se escala a la mesa; el tablero se calibra para cinco

`distancia`, `recursoCritico` y el `costoRecurso` de cada tramo son los números de
una mesa de **cinco** —el punto óptimo que declara el diseño— y el motor los
reescala al empezar, cuando por primera vez sabe cuánta gente hay. El máximo de
viajeros al trabajo pesado pasa a ser la mitad de la mesa, hasta tres.

**El juego era imposible de ganar.** No "difícil": imposible. El avance de una
noche es `base + esfuerzo − dureza` y el esfuerzo es por cabeza, así que el techo
de una travesía depende del tamaño de la mesa; con una distancia fija de 24 leguas
no se llegaba en ninguna configuración. Cero llegadas en 320 partidas simuladas con
juego óptimo, de 2 a 10 jugadores. Toda partida terminaba en *"no llegaron a
destino"*, y el objetivo `ver-el-final` —*"llegar, nada más que eso"*— no lo podía
cumplir nadie.

Lo mismo del otro lado: el consumo del recurso es por viajero y el stock era fijo,
así que con cinco en la mesa la comida se acababa en la noche 3 y con seis en la 2.
Después el hambre pega −1 de vigor a todos, todas las noches, hasta que nadie tiene
vigor para ir al trabajo pesado: **las últimas dos noches quedaban sin ninguna
decisión que tomar.**

**Por qué escalar la distancia y no dejar que cada mesa llegue distinto.** Nadie ve
las leguas: la TV pinta una fracción. El único número absoluto que se lee es el
margen del epílogo, y ese ya es relativo a esa partida. Escalar no cambia nada de
lo que la mesa percibe y hace que el tablero pueda estar calibrado.

**Por qué el trabajo pesado es la mitad de la mesa.** Con un máximo fijo de 3 y la
regla de D19 de no repetir dos noches seguidas, una mesa de 3 mandaba a los tres
disponibles la noche 2 y la noche 3 no tenía a nadie elegible: el esfuerzo salía
3, 0, 3, 0. Atado a la mitad, la rotación cierra todas las noches en cualquier
cantidad de jugadores.

**Descartado — que el aporte del esfuerzo sea una fracción de la caravana** para
que el avance no dependa del tamaño de la mesa y la distancia pudiera quedar fija.
Rompe lo único de la aritmética que un jugador puede seguir de cabeza: *uno más
empujando es una legua más*.

Los valores concretos siguen sin estar calibrados con gente. Esto los mueve de
*imposible* a *jugable y peleado*; la calibración fina sigue pidiendo las 15–20
partidas reales que dice `plan-diversion.md`.

---

### D23 — El rango de vigor se ensancha a 0–5, arrancando en 4

Era 0–3 arrancando en 3.

**`abundante` no hacía nada.** Con el tope en el valor inicial, pagar 3 de recurso
por viajero en vez de 2 era estrictamente peor que `normal` mientras la mesa
estuviera entera. La decisión de raciones tenía dos opciones reales, no tres.
Arrancar por debajo del techo es lo que le da sentido: la primera noche se puede
comprar colchón.

Y había **tres fuentes de −1 sobre un rango de 3** —`ajustado`, el trabajo pesado y
el hambre—, así que dos noches malas quebraban a cualquiera. Un quebrado no puede
ir al trabajo pesado: deja de participar de la única decisión que se toma contra
una persona. En simulación se quebraba el 100% de la mesa en el 100% de las
partidas; con el rango ensanchado y el recurso de D22, entre el 8% y el 40%.

El aspecto público (`entero`, `cansado`, `al_limite`, `quebrado`) sigue siendo de
cuatro estados y ahora sale de umbrales, no de valores exactos: recalibrar el rango
no obliga a tocar lo que se lee a tres metros.

---

### D24 — El juego pasa a ser "sigo o me vuelvo"

Se tiró el motor deliberativo entero (rutas, raciones, vigor, roles, boletas,
esfuerzo, objetos, trato, objetivos secretos, relato por LLM) y se reemplazó por
un push-your-luck: cada noche se da vuelta un tramo por vez, la plata se reparte
entre los que siguen en el camino, y después de cada tramo todos eligen a la vez
en el celular si siguen o se vuelven con lo que cargan. El segundo peligro igual
se lleva todo lo que cargan los que siguen.

**Por qué.** Después de D18–D23 el juego andaba, pero aburría: tres minutos de
deliberación sobre números abstractos, siete segundos de resultado y una resta.
Cinco roles asimétricos para explicar antes de jugar. El playtest nunca llegó a
la mesa porque nadie quería la segunda partida. Ninguna de las cirugías de
`plan-diversion.md` tocaba eso: arreglaban por qué hablar no tenía consecuencias,
no por qué no pasaba nada.

**Qué se queda.** La TV como tablero (pilar del repo), el servidor de salas, la
reconexión, el lobby con QR, la estética de papel recortado, los fondos, las
siluetas y el perro, que ahora olfatea la próxima carta y avisa en público
(acierta casi siempre, nunca siempre: D10 sigue en pie). El motor puro y
determinista con efectos `agendar`/`publicar` (D4) también.

**Qué cambia de los pilares.** D1 sigue y se cumple mejor: el celular se toca un
segundo por vuelta, y la charla es bluff ("yo sigo, eh…") con revelación
inmediata. D2 se da vuelta: ya no es cooperativo, gana el baúl más lleno. Lo que
D2 quería —gente con prioridades distintas, sin traidor— lo da que la mochila
sea pública y el baúl secreto.

**Cómo se calibra.** `apps/servidor/src/travesia.test.ts` juega 400 partidas por
tablero con bots que estiman el riesgo como lo haría una mesa y vigila la forma:
a cada jugador lo agarran entre 15% y 55% de las noches, una noche dura entre 4 y
12 tramos, ninguna estrategia gana más de la mitad de las veces y la partida
entra en 6–20 minutos. Hoy: ~7 tramos, ~35% atrapados, ~12 minutos.

**Descartado.**
- *Chamuyo* (respuestas falsas, estilo Balderdash): la que más risa da, pero
  necesita un banco grande de datos reales verificados. Queda como segundo juego
  del portal.
- *Infiltrado* (palabra secreta, estilo Spyfall): costo de contenido nulo, pero
  pide una sola discusión larga por ronda, que es lo que acá aburría.
- *Mantener el motor y sumarle push-your-luck*: dos juegos en uno, ninguno
  terminado.

El diseño anterior vive en el historial (`fea6b8c`) y sus docs
(`specs/`, `plan-diversion.md`, `plan-pendientes.md`) se borraron con él.
