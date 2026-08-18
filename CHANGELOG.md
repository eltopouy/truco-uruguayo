# Changelog - Truco Uruguayo 🇺🇾

Todas las mejoras notables y correcciones aplicadas al proyecto se documentan en este archivo.

---

## [v2.3.0] - 2026-08-14

### 👥 Modo 4 Jugadores (2 vs 2 / Parejas)
- **Motor Universal Multijugador (`GameStateManager`)**:
  - Arquitectura orientada a N jugadores (`players: [ { id, seat, team, name, hand, initialHand, isBot } ]`) con soporte nativo de 2 y 4 participantes.
  - Asignación de equipos (`Team 0`: Nosotros / `Team 1`: Ellos).
  - Rotación cíclica de turnos (`turnoSeat`) y mano (`manoSeat`) a través de las 4 posiciones de la mesa.
  - Mesa de 4 ranuras (`mesaSlots: [c0, c1, c2, c3]`).
  - Evaluación de bazas por equipos: gana el equipo con la carta de mayor poder en la mesa y el jugador individual que la jugó sale mano en la siguiente baza.
  - Manejo de empate cooperativo: si compañeros de equipo empatan en la carta más alta, su equipo gana limpiamente sin generar parda.
  - Compatibilidad regresiva 100% con modo 1v1 mediante getters/setters sincronizados (`manoJugador`, `manoOponente`, `mesa`, `turno`).

### 🤖 Inteligencia Artificial Cooperativa y Adaptativa
- **IA para Parejas**:
  - Soporte para compañeros y rivales bots en asientos 1, 2 y 3.
  - Estrategia de asistencia en el compañero (Asiento 2): no gasta cartas altas ni piezas si el jugador (Asiento 0) ya tiene la baza ganada.
  - Lectura de mesa y selección de mejor respuesta (`obtenerMejorRespuesta`).

### 🎨 Tablero y UI de 4 Asientos y Optimización Móvil
- **Diseño del Paño**:
  - Posicionamiento responsive de 4 manos: Jugador (Sur), Rival 1 (Este), Compañero (Norte), Rival 2 (Oeste).
  - Animación de reparto de 12 cartas distribuidas secuencialmente desde el Asiento Mano.
  - Mesa central con cuadrante cardinal de 4 cartas.
  - Nuevas opciones de menú en inicio: **🤖 1 vs 1** y **👥 2 vs 2**.
- **📱 Optimización Móvil y Vista Vertical**:
  - Cartas dinámicas y agrandadas para pantallas táctiles (`clamp(105px, 29.5vw, 135px)`), permitiendo una lectura nítida de números, palos y etiquetas de Pieza sin forzar la vista.
  - Centro de mesa agrandado y destacado, eliminando escalados que miniaturizaban las cartas jugadas.
  - Muestra y mazo reposicionados con escala legible (`scale(0.82)`) a los laterales.
  - Barra de acciones táctil fija al fondo con soporte de Safe Area (`env(safe-area-inset-bottom)`).
  - Ocultación de elementos decorativos flotantes no esenciales (como el mate de adorno) en pantallas móviles para evitar solapamientos.

### 🔒 Reglas de Seguridad de Base de Datos (`database.rules.json`)
- **Esquema de Validación Firebase**:
  - Restricción de escritura a salas activas y validación de tipos de datos.
  - Permisos de solo lectura para el estado maestro de la sala por parte de invitados.
  - Esquema estricto para canales de acciones (`acciones_host`, `acciones_in`, `presencia`, `chat`).

### 🧪 Expansión de Tests Automatizados
- 29 pruebas unitarias completas en `test/truco.test.js` (100% de éxito).

---

## [v2.2.0] - 2026-08-14

### 🛡️ Seguridad y Sanitización
- **Protección contra Stored XSS en Salas Públicas**: Implementación de `window.escapeHTML` para sanear los nombres de creadores de sala (`creadorName`) y claves antes de su inyección en el DOM.
- **Sanitización de Modales y Mensajes de Red**: Integración de `window.sanitizeHTML` en `UI._show()` para filtrar etiquetas y atributos peligrosos (`<script>`, `<iframe>`, `onerror`, `onload`, `javascript:`) en mensajes de red y alertas de decisión.
- **Validación de Códigos de Sala**: Restricción estricta de códigos a formato alfanumérico `^[A-Z0-9]{1,12}$` para evitar excepciones en rutas de Firebase Realtime Database con caracteres reservados (`.`, `#`, `$`, `[`, `]`, `/`).
- **Control de Longitud y Flood en Chat**: Limitación de mensajes de chat a 120 caracteres y sanitización antes de su retransmisión por Firebase.
- **Límites en Entradas de Usuario**: Adición de `maxlength` en entradas de nombre de jugador (20 caracteres), nombre de bot (20 caracteres), chat (120 caracteres) y código de sala (12 caracteres).

### 🐛 Corrección de Bugs y Estabilidad
- **Blindaje de Secuencia de Red**: Validación numérica estricta en el control de secuencias (`window.expectedRivalSeq` y `accion.seq`) para prevenir desincronizaciones o bloqueos por valores indefinidos o `NaN`.
- **Regla del Alcahuete y Jerarquía**: Verificación y blindaje del cálculo dinámico del Rey (12) cuando sustituye a una pieza base (2, 4, 5, 11 o 10).
- **Cálculo de Envido y Flor**: Consistencia completa en todos los tipos de mano (Flor común, Flor con piezas, Envido con piezas, Envido común y Envido ciego).
- **Resolución de Empates (Pardas)**: Verificación de las reglas de desempate del Truco Uruguayo (Parda en 1ª, 2ª o 3ª baza, y victoria del Mano en caso de Triple Parda).
- **Compatibilidad con Node.js**: Exportación modular (`module.exports`) en `gamestatemanager.js` para ejecución de pruebas automatizadas y soporte de entornos headless.

### 🧪 Suite de Pruebas Automatizadas
- Creación de la suite de tests en `test/truco.test.js` con 24 casos de prueba cubriendo:
  - Generación y distribución de mazo (40 cartas españolas).
  - Jerarquía de Matas y Cartas Comunes.
  - Regla del Alcahuete con todos los valores de muestra.
  - Cálculo de Envidos y Flores.
  - Resolución de bazas y rondas.
  - Cálculo de Falta Envido.
  - Funciones de seguridad y validaciones.

---

## [v2.1.0] - 2026-04-04

### 🎙️ Voces Neurales y Audio
- Integración de 14 pistas de audio sintetizadas con acento uruguayo (`es-UY-MateoNeural`) para todos los cantos del juego: Truco, Retruco, Vale 4, Envido, Real Envido, Falta Envido, Flor, Contra Flor, Quiero, No Quiero, Son Buenas y Mazo.
- Corrección en la clave de audio `no_quiero` en `SoundManager` para evitar lecturas erróneas de síntesis por defecto.
- Implementación de retardos aleatorios (`botDelay`) para que las respuestas del bot tengan un ritmo de juego natural y humano.

### 🃏 Jerarquía de Cartas y Manual
- Incorporación del modal interactivo de **Jerarquía de Cartas** accesible desde el botón de Señas.
- Integración de los nuevos activos visuales en alta resolución para el mazo Tatu (`assets/cards_tatu/`).

---

## [v2.0.0] - 2026-03-28

### 🌐 Infraestructura Multijugador
- Sistema de salas públicas y privadas con Firebase Realtime Database.
- Sincronización de estado maestro (Host/Guest) con protección anti-trampas (ocultamiento de cartas del rival en memoria).
- Sistema de presencia en tiempo real (Heartbeat y Ping) con detección de desconexión y opción de victoria por abandono.
- Chat rápido integrado con notificaciones visuales y badge de mensajes no leídos.
