# Changelog - Truco Uruguayo 🇺🇾

Todas las mejoras notables y correcciones aplicadas al proyecto se documentan en este archivo.

---

## [v2.5.0] - 2026-08-24

### 🤖 Motor de Inteligencia Artificial y Decisiones Tácticas
- **Decisiones Centralizadas y Testeables (`GameStateManager`)**:
  - Implementación de `decidirEnvido(tipoCanto, misPtos, diferenciaPuntos)` con soporte de estrategia táctica y modo kamikaze cuando el bot está en desventaja por más de 10 puntos.
  - Implementación de `decidirTruco(poderMano, rivalEsMentiroso, sospechaRapidez)` con respuesta a Retruco/Vale 4 ('voto') ante manos de poder > 80 y ajuste de umbral ante rivales bluffeadores.
  - Integración de los métodos de decisión en los controladores de eventos de Envido y Truco en `app.js`.

### 💾 Snapshot y Replay de Partidas
- **Serialización Completa del Motor (`exportarEstado` / `importarEstado`)**:
  - Función de exportación de snapshots completos de la partida (manos, rondas, apuestas, perfil de rival, memorias y estado de mesa).
  - Función de importación para restaurar instantáneamente el estado completo del motor, facilitando depuración, sincronización y futuras funciones de replay/deshacer jugada.

### 🎮 Mejoras de Experiencia de Usuario (UX)
- **Rotación Dinámica del Mazo según Repartidor (2v2 y 1v1)**:
  - El mazo y la muestra rotan fluidamente alrededor de la mesa ubicándose al lado del jugador al que le correspondió repartir las cartas en cada ronda (`deck-seat-0` al Sur, `deck-seat-1` al Este, `deck-seat-2` al Norte y `deck-seat-3` al Oeste).
  - Adaptación responsiva tanto en escritorio como en dispositivos móviles, asegurando que la muestra siempre asome orientada hacia el centro del paño.
- **Corrección de Revancha en Solitario (1 vs 1)**:
  - Se solucionó el bloqueo visual donde al aceptar "otra partida" tras terminar un partido se mostraba el paño vacío sin menú de acciones ni reparto. Ahora `iniciarSolo()` resetea los estados y despliega limpiamente las cartas y el panel de voces.
- **Indicador de Pensamiento del Bot (`typing-indicator`)**:
  - Visualización del estado de pensamiento del bot para todos los asientos en 1v1 y 2v2 (asientos 1, 2 y 3).
  - Limpieza automática del indicador al finalizar el turno del bot o cuando le corresponde jugar al usuario en `renderJuego()`.
- **Feed y Registro de Bazas Mejorado**:
  - Notificación en el log de jugadas indicando exactamente qué carta y jugador ganó cada baza intermedia (ej. `⚔️ Rival se lleva la baza con As de Espadas`).

### 📦 Calidad de Código y Arquitectura
- **Constantes de Jerarquía y Documentación JSDoc**:
  - Extracción de la matriz de poder estándar a la constante tipada y exportada `PODER_ESTANDAR`.
  - Cobertura completa de JSDoc en todos los métodos públicos del motor (`Carta`, `GameStateManager`, `calcularPuntosEnvidoFlor`, `evaluarMesa`, `jugarCarta`).

### 🧪 Suite de Pruebas Automatizadas Expandida
- **41 Pruebas Unitarias en `test/truco.test.js`** (+12 nuevos tests) cubriendo IA táctica, evaluación de poder, perfil de rival, validación de jugadas, nombres criollos tradicionales, casos borde de falta envido y snapshot de estado.
- **6 Pruebas E2E en Navegador (`test/browser.test.js`)** con Playwright, aislamiento de red con `page.route` y verificación de modales de señas, reglamento y configuración.

---

## [v2.4.0] - 2026-08-18

### 🛡️ Resiliencia de Inicio y Tests E2E Pre-Deploy
- **Corrección de Bloqueo al Iniciar Partidas (1v1 y 2v2)**:
  - Inicialización resiliente de Firebase: si la conexión es lenta o falla el CDN de Firebase, el juego en solitario continúa funcionando de manera 100% aislada e ininterrumpida.
  - Protección de `SoundManager`: manejo seguro de Web Audio y síntesis vocal sin arrojar excepciones en navegadores con autoplay bloqueado.
  - Bloque `try...finally` en `animarReparto()` e `iniciarSolo()` para garantizar que la interfaz nunca quede bloqueada en estado `isAnimatingDeal`.
  - Soporte de Flor por equipos en `resolverFlorSingleplayer` para partidas de 4 jugadores.
- **Aislamiento de Pantalla de Inicio**:
  - `#pantalla-inicio` fijada con `position: fixed` y `z-index: 999999` para evitar que el menú de voces o paneles de juego se solapen sobre la selección de partida.
  - Ocultación garantizada de `#actions-panel` y elementos de juego antes de iniciar cualquier partida.
  - `checkExistingSession()` ajustado para no secuestrar al usuario en salas viejas al ingresar a la raíz del sitio.

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
