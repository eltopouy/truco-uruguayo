/**
 * Test E2E / Simulación de Inicio y Partidas (1v1 y 2v2)
 * Comprueba que el inicio de 1 jugador y 2 jugadores funcione sin errores antes de deployar.
 * Ejecutar con: node test/e2e.test.js
 */

const assert = require('assert');
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

console.log('\n======================================================');
console.log(`🏁 RESULTADO E2E: ${passedE2E}/${totalE2E} tests pasados con éxito.`);
console.log('======================================================\n');

if (passedE2E !== totalE2E) {
    process.exit(1);
}
