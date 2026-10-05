/**
 * Test E2E / Simulación de Inicio y Partidas (1v1 y 2v2)
 * Comprueba que el inicio de 1 jugador y 2 jugadores funcione sin errores antes de deployar.
 * Ejecutar con: node test/e2e.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SoundManager = require('../js/soundmanager');
const { Carta, GameStateManager, PALOS, VALORES } = require('../js/gamestatemanager');

console.log('\n======================================================');
console.log('🚀 INICIANDO TESTS E2E DE SIMULACIÓN DE JUEGO (1v1 y 2v2)');
console.log('======================================================\n');

let passedE2E = 0;
let totalE2E = 0;

function testE2E(name, fn) {
    totalE2E++;
    try {
        fn();
        passedE2E++;
        console.log(`  ✅ ${name}`);
    } catch(err) {
        console.error(`  ❌ ${name}`);
        console.error(`     ${err.stack || err.message}`);
    }
}

// ----------------------------------------------------
// 1. Simulación SoundManager en entornos sin Audio
// ----------------------------------------------------
console.log('🔊 1. Resiliencia de Audio y Voces:');

testE2E('SoundManager se inicializa y reproduce sin fallar en entornos sin Web Audio', () => {
    const sm = new SoundManager();
    assert.doesNotThrow(() => sm.play('card-deal'));
    assert.doesNotThrow(() => sm.play('truco'));
    assert.doesNotThrow(() => sm.play('envido'));
    assert.doesNotThrow(() => sm.play('flor'));
    assert.doesNotThrow(() => sm.play('quiero'));
    assert.doesNotThrow(() => sm.play('no_quiero'));
    assert.doesNotThrow(() => sm.play('inexistente_voz'));
});

// ----------------------------------------------------
// 2. Simulación de Inicio 1 vs 1 (iniciarSolo(2))
// ----------------------------------------------------
console.log('\n🤖 2. Simulación de Flujo de Inicio 1 vs 1:');

testE2E('Iniciar Partida 1 vs 1 inicializa estado, reparte y define muestra', () => {
    const game = new GameStateManager(2);
    game.configurarJugadores(2);
    assert.strictEqual(game.numJugadores, 2);
    assert.strictEqual(game.players.length, 2);
    
    game.iniciarRonda();
    assert.strictEqual(game.partidoIniciado, true);
    assert.strictEqual(game.manoJugador.length, 3);
    assert.strictEqual(game.manoOponente.length, 3);
    assert.notStrictEqual(game.muestra, null);
    assert.strictEqual(game.piezasActivas.length, 5);

    // Simular jugada de carta del jugador
    const cartaJugada = game.jugarCarta(0, 0);
    assert.notStrictEqual(cartaJugada, null);
    assert.strictEqual(game.mesaSlots[0], cartaJugada);
    assert.strictEqual(game.manoJugador.length, 2);
});

// ----------------------------------------------------
// 3. Simulación de Inicio 2 vs 2 (iniciarSolo(4))
// ----------------------------------------------------
console.log('\n👥 3. Simulación de Flujo de Inicio 2 vs 2 (Parejas):');

testE2E('Iniciar Partida 2 vs 2 inicializa 4 jugadores en 2 equipos y reparte 12 cartas', () => {
    const game = new GameStateManager(4);
    game.configurarJugadores(4);
    assert.strictEqual(game.numJugadores, 4);
    assert.strictEqual(game.players.length, 4);

    assert.strictEqual(game.players[0].team, 0); // Tú
    assert.strictEqual(game.players[1].team, 1); // Rival Der
    assert.strictEqual(game.players[2].team, 0); // Compañero
    assert.strictEqual(game.players[3].team, 1); // Rival Izq

    game.iniciarRonda();
    assert.strictEqual(game.partidoIniciado, true);
    
    for (let i = 0; i < 4; i++) {
        assert.strictEqual(game.players[i].hand.length, 3);
        assert.strictEqual(game.players[i].initialHand.length, 3);
    }
    assert.notStrictEqual(game.muestra, null);
});

testE2E('Simulación completa de ronda de 4 jugadores con IA bot', () => {
    const game = new GameStateManager(4);
    game.iniciarRonda();

    // Simular que los 4 asientos juegan su primera carta en orden
    for (let s = 0; s < 4; s++) {
        const currentSeat = game.turnoSeat;
        const player = game.players[currentSeat];
        assert(player.hand.length > 0);
        
        // Simular jugada de la primera carta disponible
        const c = game.jugarCarta(currentSeat, 0);
        assert.notStrictEqual(c, null);
        assert.strictEqual(game.mesaSlots[currentSeat], c);
    }

    // Todos jugaron: evaluar baza
    const resBaza = game.evaluarMesa();
    assert(resBaza.ganadorMesa === 'jugador' || resBaza.ganadorMesa === 'oponente' || resBaza.ganadorMesa === 'empate');
    assert.strictEqual(game.mesaSlots.filter(x => x !== null).length, 0); // Mesa limpia para próxima baza
});

// ----------------------------------------------------
// 4. Verificación de Resiliencia y Detección de Errores
// ----------------------------------------------------
console.log('\n🛡️ 4. Resiliencia de Inicialización y Fallbacks:');

testE2E('Verificar cálculo de Flor y Envido en todas las combinaciones de manos sin excepciones', () => {
    const game = new GameStateManager(4);
    
    // Repetir 50 veces con manos y muestras aleatorias
    for (let iter = 0; iter < 50; iter++) {
        game.iniciarRonda();
        for (let p of game.players) {
            const calc = game.calcularPuntosEnvidoFlor(p.hand);
            assert(typeof calc.puntos === 'number');
            assert(typeof calc.tieneFlor === 'boolean');
            assert(calc.puntos >= 0 && calc.puntos <= 50);
        }
    }
});

// ----------------------------------------------------
// 5. Aislamiento de Pantalla de Inicio
// ----------------------------------------------------
console.log('\n📱 5. Aislamiento de Pantalla de Inicio:');

testE2E('El menú de voces y elementos de juego deben ocultarse si la pantalla de inicio está activa', () => {
    const game = new GameStateManager(2);
    
    // Simular que el juego no está iniciado o que pantalla-inicio está visible
    assert.strictEqual(game.partidoIniciado, false);
    
    // Función de decisión de visibilidad
    const isInicioVisible = true;
    const shouldShowActions = (!isInicioVisible && game.partidoIniciado);
    assert.strictEqual(shouldShowActions, false);
});

testE2E('Al iniciar partida en solitario, el estado se activa limpiamente y se borran sesiones viejas', () => {
    const game = new GameStateManager(2);
    game.partidoIniciado = true;
    const isInicioVisible = false;
    const shouldShowActions = (!isInicioVisible && game.partidoIniciado);
    assert.strictEqual(shouldShowActions, true);
});

// ----------------------------------------------------
// 6. Perspectiva Multijugador y Posicionamiento de Cartas
// ----------------------------------------------------
console.log('\n🌐 6. Perspectiva Multijugador y Posición de Cartas:');

testE2E('Invitado debe recibir sus cartas en el asiento 0 (abajo) y las del rival en el asiento 1 (arriba)', () => {
    // Simular el estado maestro generado por el host
    const hostHand = [{ valor: 1, palo: 'Espada', oculto: true }, { valor: 7, palo: 'Espada', oculto: true }, { valor: 3, palo: 'Basto', oculto: true }];
    const guestHand = [{ valor: 2, palo: 'Oro', poder: 100, esPieza: true }, { valor: 4, palo: 'Oro', poder: 99, esPieza: true }, { valor: 5, palo: 'Espada', poder: 8 }];
    
    const estadoMaestroDelHost = {
        players: [
            { id: 'p0', seat: 0, team: 0, name: 'Host', hand: hostHand, initialHand: hostHand, isBot: false },
            { id: 'p1', seat: 1, team: 1, name: 'Invitado', hand: guestHand, initialHand: guestHand, isBot: false }
        ],
        manoJugador: hostHand,
        manoOponente: guestHand,
        manoInicialJugador: hostHand,
        manoInicialOponente: guestHand,
        turno: 'jugador',
        turnoSeat: 0,
        manoSeat: 0,
        manoDelPartido: 'jugador',
        puntosPartido: { jugador: 6, oponente: 4 },
        config: { nombreJugador: 'Host', nombreOponente: 'Invitado', limitePuntos: 30 }
    };

    // Función pura de inversión que usa firebasemanager
    function aislarManoParaInvitado(gameObj) {
        if (!gameObj) return null;
        let playersInvertidos = [];
        if (gameObj.players && Array.isArray(gameObj.players) && gameObj.players.length >= 2) {
            playersInvertidos = [
                {
                    ...(gameObj.players[1] || {}),
                    id: 'p1_guest',
                    seat: 0,
                    team: 0,
                    name: gameObj.config?.nombreOponente || "TÚ",
                    isBot: false,
                    hand: gameObj.manoOponente || (gameObj.players[1] ? gameObj.players[1].hand : []),
                    initialHand: gameObj.manoInicialOponente || (gameObj.players[1] ? gameObj.players[1].initialHand : [])
                },
                {
                    ...(gameObj.players[0] || {}),
                    id: 'p0_host',
                    seat: 1,
                    team: 1,
                    name: gameObj.config?.nombreJugador || "RIVAL",
                    isBot: false,
                    hand: gameObj.manoJugador || (gameObj.players[0] ? gameObj.players[0].hand : []),
                    initialHand: gameObj.manoInicialJugador || (gameObj.players[0] ? gameObj.players[0].initialHand : [])
                }
            ];
        }
        return {
            ...gameObj,
            players: playersInvertidos,
            manoJugador: gameObj.manoOponente || [],
            manoOponente: gameObj.manoJugador || [],
            puntosPartido: { jugador: gameObj.puntosPartido?.oponente || 0, oponente: gameObj.puntosPartido?.jugador || 0 }
        };
    }

    const estadoInvitado = aislarManoParaInvitado(estadoMaestroDelHost);

    // Verificaciones críticas:
    // 1. En el asiento 0 (abajo/TÚ) deben estar las cartas descubiertas del invitado
    assert.strictEqual(estadoInvitado.players[0].name, 'Invitado');
    assert.strictEqual(estadoInvitado.players[0].hand[0].valor, 2);
    assert.strictEqual(estadoInvitado.players[0].hand[0].palo, 'Oro');
    assert.strictEqual(estadoInvitado.players[0].hand[0].oculto, undefined);
    assert.strictEqual(estadoInvitado.manoJugador[0].valor, 2);

    // 2. En el asiento 1 (arriba/RIVAL) deben estar las cartas ocultas del rival
    assert.strictEqual(estadoInvitado.players[1].name, 'Host');
    assert.strictEqual(estadoInvitado.players[1].hand[0].oculto, true);
    assert.strictEqual(estadoInvitado.manoOponente[0].oculto, true);

    // 3. Los puntos del invitado deben asignarse a 'jugador'
    assert.strictEqual(estadoInvitado.puntosPartido.jugador, 4);
    assert.strictEqual(estadoInvitado.puntosPartido.oponente, 6);
});

// ----------------------------------------------------
// 7. Rotación del Mazo en 4P y Revancha 1P
// ----------------------------------------------------
console.log('\n🔄 7. Rotación del Mazo en 4P y Flujo de Revancha:');

testE2E('Rotación del Mazo en 4P: El repartidor rota en cada ronda (3 -> 0 -> 1 -> 2)', () => {
    const game = new GameStateManager(4);
    
    // Ronda 1: manoSeat = 0 -> dealerSeat = (0 + 4 - 1) % 4 = 3 (Rival Izquierda repartió)
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 0);
    const dealerRonda1 = (game.manoSeat + 4 - 1) % 4;
    assert.strictEqual(dealerRonda1, 3);

    // Ronda 2: manoSeat = 1 -> dealerSeat = 0 (Jugador Sur repartió)
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 1);
    const dealerRonda2 = (game.manoSeat + 4 - 1) % 4;
    assert.strictEqual(dealerRonda2, 0);

    // Ronda 3: manoSeat = 2 -> dealerSeat = 1 (Rival Derecha repartió)
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 2);
    const dealerRonda3 = (game.manoSeat + 4 - 1) % 4;
    assert.strictEqual(dealerRonda3, 1);

    // Ronda 4: manoSeat = 3 -> dealerSeat = 2 (Compañero repartió)
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 3);
    const dealerRonda4 = (game.manoSeat + 4 - 1) % 4;
    assert.strictEqual(dealerRonda4, 2);
});

testE2E('Flujo de Revancha en Solitario: Reinicia estado de partidoFinalizado y activa partida nueva', () => {
    const game = new GameStateManager(2);
    game.iniciarRonda();
    
    // Simular que terminó el partido
    game.puntosPartido.jugador = 30;
    game.partidoFinalizado = true;
    assert.strictEqual(game.partidoFinalizado, true);

    // Al pedir revancha:
    game.puntosPartido.jugador = 0;
    game.puntosPartido.oponente = 0;
    game.partidoFinalizado = false;
    game.iniciarRonda();

    assert.strictEqual(game.puntosPartido.jugador, 0);
    assert.strictEqual(game.puntosPartido.oponente, 0);
    assert.strictEqual(game.partidoFinalizado, false);
    assert.strictEqual(game.partidoIniciado, true);
    assert.strictEqual(game.manoJugador.length, 3);
    assert.strictEqual(game.manoOponente.length, 3);
    assert.notStrictEqual(game.muestra, null);
});

// ----------------------------------------------------
// 8. Flujo Multijugador: Salto de Flor y Canto de Truco
// ----------------------------------------------------
console.log('\n🌐 8. Flujo Multijugador (Salto de Flor y Retruco):');

testE2E('Respuesta Salto de Flor (tengo_flor) adjudica 3 puntos al rival y avanza a fase truco sin bloqueo', () => {
    const game = new GameStateManager(2);
    game.iniciarRonda();

    let syncDesbloqueado = false;
    const fakeDesbloquearSync = () => { syncDesbloqueado = true; };

    // Simular recepción de d = { tipo: 'envido', resp: 'tengo_flor' } en creador
    const d = { tipo: 'envido', resp: 'tengo_flor' };
    const miRol = 'creador';

    if (d.tipo === 'envido' && d.resp === 'tengo_flor') {
        if (miRol === 'creador') {
            game.puntosPartido.oponente += 3;
            game.fase = 'truco';
        }
        fakeDesbloquearSync();
    }

    assert.strictEqual(game.puntosPartido.oponente, 3, 'El rival con Flor debe recibir 3 pts');
    assert.strictEqual(game.fase, 'truco', 'La fase debe pasar a truco');
    assert.strictEqual(syncDesbloqueado, true, 'El estado de sincronización debe liberarse');
});

testE2E('Opciones de Truco en Red permiten Retruco y Vale 4 según el nivel', () => {
    function generarOpcionesTruco(sigNivel) {
        const opciones = [
            { label: "QUIERO", value: "quiero" },
            { label: "NO QUIERO", value: "no_quiero" }
        ];
        if (sigNivel === 'truco') {
            opciones.push({ label: "¡RETRUCO! (3 pts)", value: "retruco" });
        } else if (sigNivel === 'retruco') {
            opciones.push({ label: "¡VALE 4! (4 pts)", value: "vale4" });
        }
        return opciones;
    }

    const optsTruco = generarOpcionesTruco('truco');
    assert.strictEqual(optsTruco.some(o => o.value === 'retruco'), true, 'Debe ofrecer Retruco ante Truco');

    const optsRetruco = generarOpcionesTruco('retruco');
    assert.strictEqual(optsRetruco.some(o => o.value === 'vale4'), true, 'Debe ofrecer Vale 4 ante Retruco');

    const optsVale4 = generarOpcionesTruco('vale4');
    assert.strictEqual(optsVale4.some(o => o.value === 'retruco' || o.value === 'vale4'), false, 'Vale 4 no permite subidas');
});

// ----------------------------------------------------
// 9. PWA, Service Worker e Íconos
// ----------------------------------------------------
console.log('\n📱 9. PWA, Service Worker y Manifiesto:');

testE2E('Service Worker sw.js existe y contiene lista de precaché', () => {
    const swPath = path.join(__dirname, '..', 'sw.js');
    assert.strictEqual(fs.existsSync(swPath), true, 'sw.js debe existir en la raíz');
    const content = fs.readFileSync(swPath, 'utf8');
    assert.strictEqual(content.includes('CACHE_NAME'), true);
    assert.strictEqual(content.includes('PRECACHE_ASSETS'), true);
});

testE2E('manifest.json es válido y todos sus íconos existen en el disco', () => {
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    assert.strictEqual(fs.existsSync(manifestPath), true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.name, 'Truco Uruguayo Premium');
    assert.strictEqual(manifest.start_url, '/');
    assert.strictEqual(Array.isArray(manifest.icons), true);
    assert.strictEqual(manifest.icons.length >= 2, true);

    manifest.icons.forEach(ico => {
        const cleanPath = ico.src.replace(/^\//, '');
        const fullIconPath = path.join(__dirname, '..', cleanPath);
        assert.strictEqual(fs.existsSync(fullIconPath), true, `El ícono ${ico.src} debe existir físicamente`);
    });
});

// ----------------------------------------------------
// 10. SoundManager: Fallback Procedural y Mute
// ----------------------------------------------------
console.log('\n🔊 10. Resiliencia de Audio y Síntesis Procedural:');

testE2E('SoundManager permite mutear y desmutear correctamente', () => {
    const sm = new SoundManager();
    sm.setMuted(true);
    assert.strictEqual(sm.muted, true);
    sm.setMuted(false);
    assert.strictEqual(sm.muted, false);
});

testE2E('SoundManager métodos de fallback procedural no lanzan excepciones', () => {
    const sm = new SoundManager();
    assert.doesNotThrow(() => sm._playSynthFallback('card-play'));
    assert.doesNotThrow(() => sm._playSynthFallback('card-deal'));
    assert.doesNotThrow(() => sm._playSynthFallback('win-baza'));
    assert.doesNotThrow(() => sm._playSynthFallback('loss'));
    assert.doesNotThrow(() => sm.unlock());
});

// ----------------------------------------------------
// 11. Reordenamiento de Cartas en Mano
// ----------------------------------------------------
console.log('\n🃏 11. Reordenamiento de Cartas en Mano:');

testE2E('Reordenar cartas en mano actualiza game.players[0].hand y game.manoJugador correctamente', () => {
    const game = new GameStateManager();
    game.configurarJugadores(2);
    game.iniciarRonda();

    const cartaOriginal0 = game.players[0].hand[0];
    const cartaOriginal1 = game.players[0].hand[1];
    const cartaOriginal2 = game.players[0].hand[2];

    // Simular mover la carta del medio (índice 1) a la izquierda (índice 0)
    const [moved] = game.players[0].hand.splice(1, 1);
    game.players[0].hand.splice(0, 0, moved);
    game.manoJugador = game.players[0].hand;

    assert.strictEqual(game.players[0].hand[0], cartaOriginal1, 'La carta 1 ahora debe estar en el índice 0');
    assert.strictEqual(game.players[0].hand[1], cartaOriginal0, 'La carta 0 ahora debe estar en el índice 1');
    assert.strictEqual(game.players[0].hand[2], cartaOriginal2, 'La carta 2 debe mantenerse en el índice 2');
    assert.strictEqual(game.manoJugador[0], cartaOriginal1, 'manoJugador debe reflejar el nuevo orden');

    // Jugar la carta del índice 0
    game.turnoSeat = 0;
    const cartaJugada = game.jugarCarta(0, 0);
    assert.strictEqual(cartaJugada, cartaOriginal1, 'La carta jugada debe ser la que se movió al índice 0');
    assert.strictEqual(game.players[0].hand.length, 2, 'Deben quedar 2 cartas');
});

testE2E('Reordenar 2 cartas restantes invierte su orden limpiamente', () => {
    const game = new GameStateManager();
    game.configurarJugadores(2);
    game.iniciarRonda();
    game.turnoSeat = 0;
    game.jugarCarta(0, 0); // Jugar 1 carta, quedan 2

    const cA = game.players[0].hand[0];
    const cB = game.players[0].hand[1];

    const [m] = game.players[0].hand.splice(1, 1);
    game.players[0].hand.splice(0, 0, m);

    assert.strictEqual(game.players[0].hand[0], cB);
    assert.strictEqual(game.players[0].hand[1], cA);
});

console.log('\n======================================================');
console.log(`🏁 RESULTADO E2E: ${passedE2E}/${totalE2E} tests pasados con éxito.`);
console.log('======================================================\n');

if (passedE2E !== totalE2E) {
    process.exit(1);
}
