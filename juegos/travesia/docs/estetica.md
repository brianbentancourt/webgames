# Estética Visual: "Paper Cutout" y Stop-Motion (La Travesía)

Cuando diseñes o modifiques interfaces (UI) para el juego "La Travesía" (`juegos/travesia`), debes apegarte estrictamente al siguiente estilo visual. Esto se aplica tanto a la pantalla principal de TV (`/tv`) como al control de celular (`/control`).

## 1. Textura y Materialidad (Papel/Cartulina)
El mundo del juego y la interfaz están hechos de papel rústico, cartón o cartulina.
- Nunca uses colores planos o gradientes corporativos.
- Aplica una textura global de ruido (noise) o textura de papel usando pseudoelementos o fondos sutiles.
- Los colores deben ser terrosos, cálidos y ligeramente desaturados (salvo acentos como el fuego o notificaciones críticas).

## 2. Sombras Duras (Profundidad Física)
- Evita las sombras suaves (`box-shadow` con mucho desenfoque) propias del "Flat Design" o "Material Design".
- Usa `filter: drop-shadow(...)` con desenfoque 0 o casi nulo, y un offset claro (ej. `4px 6px 0px rgba(0,0,0,0.4)`).
- Esto debe dar la sensación de que los elementos están recortados y superpuestos físicamente sobre una mesa o panel.

## 3. Formas Irregulares (Tijeras)
- No uses `border-radius` perfectos (como 50% para círculos perfectos o bordes redondeados estándar).
- Usa `clip-path: polygon(...)` para hacer bordes rectos ligeramente asimétricos, simulando tijeretazos.
- Aplica ligeras rotaciones (`transform: rotate(-1deg)` o `1deg`) para romper la simetría horizontal o vertical.

## 4. Animaciones Stop-Motion
- Evita animaciones ultra-fluidas a 60fps con `ease` o `linear` cuando se trate de movimientos dentro del mundo del juego o apariciones narrativas.
- Usa `steps(N, end)` en tus `@keyframes` y `transition-timing-function` para simular fotografías cuadro a cuadro (stop-motion). Por ejemplo: `transition: opacity 0.6s steps(4, end)`.

Estas directrices evitan que el juego parezca genérico o "generado por IA", dándole una personalidad artesanal y única que encaja con la temática de un fogón y una caravana.
