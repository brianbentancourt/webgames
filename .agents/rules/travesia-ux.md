# UX y Textos: "Aprender sobre la marcha" (Sálvese quien pueda!)

Cuando diseñes componentes, agregues acciones o modifiques la UI del cliente (especialmente `/control`), tené presente la siguiente filosofía de diseño UX para el juego:

## 1. El juego debe enseñar a jugar
- Los jugadores nunca leen manuales de reglas. El juego tiene que ser completamente intuitivo y guiarlos paso a paso en su primer uso.
- Nunca asumas que el jugador sabe para qué sirve un concepto mecánico (ej. "Esfuerzo", "Vigor", "Raciones").

## 2. Textos Explicativos Cortos
- Acompañá cada acción o pantalla de decisión con una pregunta o frase corta (usando la clase CSS `.linea`) que traduzca la mecánica a la narrativa del juego.
- **Ejemplo Malo:** `Quien hace esfuerzo` (muy técnico, asume conocimiento).
- **Ejemplo Bueno:** `¿Quién gasta vigor para que la caravana avance más rápido esta noche?` (enseña la consecuencia narrativa).

## 3. Presupuesto de lectura
Como se menciona en la especificación, los textos deben ser breves y scaneables:
- **Título de pantalla:** Máximo 4 palabras.
- **Pregunta / Línea explicativa:** Máximo 20 palabras.
- **Botones / Opciones:** Máximo 3 palabras si es posible.

Nunca agregues párrafos de texto explicativo en las pantallas de acción. Si necesitás un párrafo para explicarlo, la mecánica es demasiado compleja para la pantalla del celular.
