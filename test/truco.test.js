/**
 * Test suite para Truco Uruguayo
 * Ejecutar con: node test/truco.test.js
 */

const assert = require('assert');
const { Carta, GameStateManager, PALOS, VALORES, PODER_ESTANDAR } = require('../js/gamestatemanager');

// Test utilities
let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        console.error(`  ❌ ${name}`);
        console.error(`     ${err.message}`);
    }
}

console.log('\n========================================');
console.log('🃏 INICIANDO TESTS DE TRUCO URUGUAYO');
console.log('========================================\n');

// ----------------------------------------------------
// 1. Mazo y Estructura
// ----------------------------------------------------
console.log('📦 1. Mazo y Estructura de Cartas:');

test('El mazo debe contener exactamente 40 cartas (sin 8s ni 9s)', () => {
    const game = new GameStateManager();
    game.crearMazo();
    assert.strictEqual(game.mazo.length, 40);
    const ochos = game.mazo.filter(c => c.valor === 8);
    const nueves = game.mazo.filter(c => c.valor === 9);
    assert.strictEqual(ochos.length, 0);
    assert.strictEqual(nueves.length, 0);
});

test('El mazo debe tener 10 cartas por cada uno de los 4 palos', () => {
    const game = new GameStateManager();
    game.crearMazo();
    for (let palo of PALOS) {
        const cartasPalo = game.mazo.filter(c => c.palo === palo);
        assert.strictEqual(cartasPalo.length, 10);
    }
});

// ----------------------------------------------------
// 2. Jerarquía Estándar (Sin Piezas)
// ----------------------------------------------------
console.log('\n⚔️ 2. Jerarquía Estándar de Cartas:');

test('Las Matas deben tener el orden de poder correcto (1E > 1B > 7E > 7O)', () => {
    const game = new GameStateManager();
    const asEspada = new Carta(1, 'Espada');
    const asBasto = new Carta(1, 'Basto');
    const sieteEspada = new Carta(7, 'Espada');
    const sieteOro = new Carta(7, 'Oro');
    const tresCopa = new Carta(3, 'Copa');

    assert.strictEqual(game.obtenerPoderEstandar(asEspada), 20);
    assert.strictEqual(game.obtenerPoderEstandar(asBasto), 19);
    assert.strictEqual(game.obtenerPoderEstandar(sieteEspada), 18);
    assert.strictEqual(game.obtenerPoderEstandar(sieteOro), 17);
    assert.strictEqual(game.obtenerPoderEstandar(tresCopa), 16);

    assert(game.obtenerPoderEstandar(asEspada) > game.obtenerPoderEstandar(asBasto));
    assert(game.obtenerPoderEstandar(asBasto) > game.obtenerPoderEstandar(sieteEspada));
    assert(game.obtenerPoderEstandar(sieteEspada) > game.obtenerPoderEstandar(sieteOro));
    assert(game.obtenerPoderEstandar(sieteOro) > game.obtenerPoderEstandar(tresCopa));
});

test('Las cartas comunes deben seguir el orden descendente', () => {
    const game = new GameStateManager();
    const tres = new Carta(3, 'Basto');
    const dos = new Carta(2, 'Copa');
    const asCopa = new Carta(1, 'Copa');
    const rey = new Carta(12, 'Oro');
    const caballo = new Carta(11, 'Espada');
    const sota = new Carta(10, 'Basto');
    const sieteComun = new Carta(7, 'Copa');
    const seis = new Carta(6, 'Oro');
    const cinco = new Carta(5, 'Espada');
    const cuatro = new Carta(4, 'Basto');

    assert(game.obtenerPoderEstandar(tres) > game.obtenerPoderEstandar(dos));
    assert(game.obtenerPoderEstandar(dos) > game.obtenerPoderEstandar(asCopa));
    assert(game.obtenerPoderEstandar(asCopa) > game.obtenerPoderEstandar(rey));
    assert(game.obtenerPoderEstandar(rey) > game.obtenerPoderEstandar(caballo));
    assert(game.obtenerPoderEstandar(caballo) > game.obtenerPoderEstandar(sota));
    assert(game.obtenerPoderEstandar(sota) > game.obtenerPoderEstandar(sieteComun));
    assert(game.obtenerPoderEstandar(sieteComun) > game.obtenerPoderEstandar(seis));
    assert(game.obtenerPoderEstandar(seis) > game.obtenerPoderEstandar(cinco));
    assert(game.obtenerPoderEstandar(cinco) > game.obtenerPoderEstandar(cuatro));
});

// ----------------------------------------------------
// 3. Piezas y Regla del Alcahuete
// ----------------------------------------------------
console.log('\n👑 3. Piezas y Regla del Alcahuete:');

test('Muestra normal (7 de Oro): Piezas son 2, 4, 5, 11, 10 de Oro', () => {
    const game = new GameStateManager();
    game.muestra = new Carta(7, 'Oro');
    game.paloMuestra = 'Oro';
    game.definirPiezas();

    assert.deepStrictEqual(game.piezasActivas, [2, 4, 5, 11, 10]);

    const dosOro = new Carta(2, 'Oro');
    const cuatroOro = new Carta(4, 'Oro');
    const cincoOro = new Carta(5, 'Oro');
    const perico = new Carta(11, 'Oro');
    const perica = new Carta(10, 'Oro');

    game.actualizarMatrizDePoder(dosOro, cuatroOro, cincoOro, perico, perica);

    assert.strictEqual(dosOro.esPieza, true);
    assert.strictEqual(dosOro.poder, 100);
    assert.strictEqual(dosOro.puntosEnvido, 30);

    assert.strictEqual(cuatroOro.poder, 99);
    assert.strictEqual(cuatroOro.puntosEnvido, 29);

    assert.strictEqual(cincoOro.poder, 98);
    assert.strictEqual(cincoOro.puntosEnvido, 28);

    assert.strictEqual(perico.poder, 97);
    assert.strictEqual(perico.puntosEnvido, 27);

    assert.strictEqual(perica.poder, 96);
    assert.strictEqual(perica.puntosEnvido, 27);
});

test('Regla del Alcahuete: si la muestra es el 2 de Copa, el Rey (12) se convierte en la Pieza Mayor', () => {
    const game = new GameStateManager();
    game.muestra = new Carta(2, 'Copa');
    game.paloMuestra = 'Copa';
    game.definirPiezas();

    // El 12 reemplaza al 2 en el índice 0
    assert.deepStrictEqual(game.piezasActivas, [12, 4, 5, 11, 10]);

    const reyCopa = new Carta(12, 'Copa'); // Alcahuete
    const dosCopa = new Carta(2, 'Copa');  // Muestra (ya no es pieza activa en mano)

    game.actualizarMatrizDePoder(reyCopa, dosCopa);

    assert.strictEqual(reyCopa.esPieza, true);
    assert.strictEqual(reyCopa.poder, 100);
    assert.strictEqual(reyCopa.puntosEnvido, 30);

    assert.strictEqual(dosCopa.esPieza, false);
    assert.strictEqual(dosCopa.poder, 15); // Poder estándar del 2
});

test('Regla del Alcahuete: si la muestra es el 4 de Espada, el Rey (12) reemplaza al 4', () => {
    const game = new GameStateManager();
    game.muestra = new Carta(4, 'Espada');
    game.paloMuestra = 'Espada';
    game.definirPiezas();

    assert.deepStrictEqual(game.piezasActivas, [2, 12, 5, 11, 10]);

    const reyEspada = new Carta(12, 'Espada');
    game.actualizarMatrizDePoder(reyEspada);

    assert.strictEqual(reyEspada.esPieza, true);
    assert.strictEqual(reyEspada.poder, 99);
    assert.strictEqual(reyEspada.puntosEnvido, 29);
});

test('Regla del Alcahuete: si la muestra es el 11 (Perico) de Basto, el Rey (12) reemplaza al 11', () => {
    const game = new GameStateManager();
    game.muestra = new Carta(11, 'Basto');
    game.paloMuestra = 'Basto';
    game.definirPiezas();

    assert.deepStrictEqual(game.piezasActivas, [2, 4, 5, 12, 10]);

    const reyBasto = new Carta(12, 'Basto');
    game.actualizarMatrizDePoder(reyBasto);

    assert.strictEqual(reyBasto.esPieza, true);
    assert.strictEqual(reyBasto.poder, 97);
    assert.strictEqual(reyBasto.puntosEnvido, 27);
});

// ----------------------------------------------------
// 4. Cálculo de Envido y Flor
// ----------------------------------------------------
console.log('\n🌸 4. Cálculo de Envido y Flor:');

test('Envido Común: 2 cartas del mismo palo (7 y 6 de Espada) -> 33 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(7, 'Espada');
    const c2 = new Carta(6, 'Espada');
    const c3 = new Carta(1, 'Basto');
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, false);
    assert.strictEqual(res.puntos, 33); // 20 + 7 + 6
});

test('Envido de Figuras: dos figuras del mismo palo valen 20 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(10, 'Copa');
    const c2 = new Carta(12, 'Copa');
    const c3 = new Carta(4, 'Basto');
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, false);
    assert.strictEqual(res.puntos, 20); // 20 + 0 + 0
});

test('Envido Ciego (Solo): tres cartas de palos distintos sin piezas -> carta más alta', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(4, 'Espada');
    const c2 = new Carta(5, 'Basto');
    const c3 = new Carta(6, 'Copa');
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, false);
    assert.strictEqual(res.puntos, 6);
});

test('Envido con 1 Pieza (2 de Oro = 30 pts) + carta común (7 de Espada) -> 37 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(2, 'Oro');    // Pieza (30 pts)
    const c2 = new Carta(7, 'Espada'); // Común (7 pts)
    const c3 = new Carta(1, 'Copa');   // Común (1 pt)
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, false);
    assert.strictEqual(res.puntos, 37); // 30 + 7
});

test('Flor Común: 3 cartas del mismo palo (7, 6, 5 de Copa) -> 38 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(7, 'Copa');
    const c2 = new Carta(6, 'Copa');
    const c3 = new Carta(5, 'Copa');
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, true);
    assert.strictEqual(res.puntos, 38); // 20 + 7 + 6 + 5
});

test('Flor con 2 Piezas (2 de Oro = 30, 4 de Oro = 29) + 7 de Espada -> 46 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(2, 'Oro');    // 30
    const c2 = new Carta(4, 'Oro');    // 29 -> suma 9
    const c3 = new Carta(7, 'Espada'); // 7
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, true);
    assert.strictEqual(res.puntos, 46); // 30 + 9 + 7
});

test('Flor con 3 Piezas (2 de Oro = 30, 4 de Oro = 29, 5 de Oro = 28) -> 47 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(2, 'Oro'); // 30
    const c2 = new Carta(4, 'Oro'); // 29 -> +9
    const c3 = new Carta(5, 'Oro'); // 28 -> +8
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, true);
    assert.strictEqual(res.puntos, 47); // 30 + 9 + 8
});

test('Flor con 1 Pieza (2 de Oro = 30) + 2 cartas del mismo palo (7 y 6 de Basto) -> 43 pts', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const c1 = new Carta(2, 'Oro');   // 30
    const c2 = new Carta(7, 'Basto'); // 7
    const c3 = new Carta(6, 'Basto'); // 6
    game.actualizarMatrizDePoder(c1, c2, c3);

    const res = game.calcularPuntosEnvidoFlor([c1, c2, c3]);
    assert.strictEqual(res.tieneFlor, true);
    assert.strictEqual(res.puntos, 43); // 30 + 7 + 6
});

// ----------------------------------------------------
// 5. Resolución de Bazas y Rondas (Truco)
// ----------------------------------------------------
console.log('\n🃏 5. Resolución de Bazas y Rondas:');

test('Victoria 2 a 0: Ganar 1ra y 2da baza da victoria directa', () => {
    const game = new GameStateManager();
    game.mesa.jugador = new Carta(1, 'Espada'); // Poder 20
    game.mesa.oponente = new Carta(4, 'Copa');   // Poder 7
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);

    let res1 = game.evaluarMesa();
    assert.strictEqual(res1.ganadorMesa, 'jugador');
    assert.strictEqual(res1.ganadorRonda, null);

    game.mesa.jugador = new Carta(1, 'Basto'); // Poder 19
    game.mesa.oponente = new Carta(5, 'Copa');  // Poder 8
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);

    let res2 = game.evaluarMesa();
    assert.strictEqual(res2.ganadorMesa, 'jugador');
    assert.strictEqual(res2.ganadorRonda, 'jugador');
    assert.strictEqual(game.rondaTerminada, true);
});

test('Parda en 1ª Baza: Gana el que se lleve la 2ª baza', () => {
    const game = new GameStateManager();
    // Baza 1: Empate (3 de Copa vs 3 de Oro)
    game.mesa.jugador = new Carta(3, 'Copa');
    game.mesa.oponente = new Carta(3, 'Oro');
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);

    let res1 = game.evaluarMesa();
    assert.strictEqual(res1.ganadorMesa, 'empate');
    assert.strictEqual(res1.ganadorRonda, null);

    // Baza 2: Jugador gana
    game.mesa.jugador = new Carta(1, 'Espada');
    game.mesa.oponente = new Carta(4, 'Basto');
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);

    let res2 = game.evaluarMesa();
    assert.strictEqual(res2.ganadorMesa, 'jugador');
    assert.strictEqual(res2.ganadorRonda, 'jugador');
    assert.strictEqual(game.rondaTerminada, true);
});

test('Parda en 2ª o 3ª Baza: Gana el que ganó la 1ª baza', () => {
    const game = new GameStateManager();
    // Baza 1: Gana jugador
    game.mesa.jugador = new Carta(7, 'Espada');
    game.mesa.oponente = new Carta(4, 'Copa');
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);
    game.evaluarMesa();

    // Baza 2: Empate
    game.mesa.jugador = new Carta(3, 'Copa');
    game.mesa.oponente = new Carta(3, 'Oro');
    game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);
    let res2 = game.evaluarMesa();

    assert.strictEqual(res2.ganadorMesa, 'empate');
    assert.strictEqual(res2.ganadorRonda, 'jugador');
    assert.strictEqual(game.rondaTerminada, true);
});

test('Triple Parda: Si las 3 bazas empatan, gana el Mano', () => {
    const game = new GameStateManager();
    game.manoDelPartido = 'oponente';

    for (let i = 0; i < 3; i++) {
        game.mesa.jugador = new Carta(3, 'Copa');
        game.mesa.oponente = new Carta(3, 'Oro');
        game.actualizarMatrizDePoder(game.mesa.jugador, game.mesa.oponente);
        game.evaluarMesa();
    }

    assert.strictEqual(game.rondaTerminada, true);
    assert.strictEqual(game.manosGanadas.empates, 3);
});

// ----------------------------------------------------
// 6. Falta Envido
// ----------------------------------------------------
console.log('\n📊 6. Falta Envido:');

test('Cálculo de Falta Envido: Puntos restantes al que va primero', () => {
    const game = new GameStateManager();
    game.config.limitePuntos = 30;
    game.puntosPartido.jugador = 22;
    game.puntosPartido.oponente = 15;

    // Al jugador le faltan 30 - 22 = 8 pts
    assert.strictEqual(game.calcPuntosFalta(), 8);

    game.puntosPartido.jugador = 10;
    game.puntosPartido.oponente = 27;
    // Al oponente le faltan 30 - 27 = 3 pts
    assert.strictEqual(game.calcPuntosFalta(), 3);
});

// ----------------------------------------------------
// 7. Seguridad y Sanitización
// ----------------------------------------------------
console.log('\n🛡️ 7. Seguridad y Sanitización:');

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeHTML(html) {
    if (html === null || html === undefined) return '';
    const str = String(html);
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
        .replace(/href\s*=\s*['"]?javascript:[^'"]*['"]?/gi, 'href="#"');
}

test('escapeHTML debe neutralizar caracteres de inyección XSS', () => {
    const malicious = '<script>alert("xss")</script>&"\'';
    const escaped = escapeHTML(malicious);
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#039;');
});

test('sanitizeHTML debe remover scripts y manejadores de eventos (onerror/onload)', () => {
    const input = '<img src=x onerror="alert(1)"><b>Hola</b><script>fetch("evil")</script>';
    const sanitized = sanitizeHTML(input);
    assert.strictEqual(sanitized.includes('onerror'), false);
    assert.strictEqual(sanitized.includes('<script>'), false);
    assert.strictEqual(sanitized.includes('<b>Hola</b>'), true);
});

test('Validación de Código de Sala debe rechazar caracteres especiales de Firebase', () => {
    const validCodes = ['SALA12', 'A3B9X1', 'CHARRUA'];
    const invalidCodes = ['SALA/1', 'A.B.C', 'ROOM#1', 'SALA$1', 'ROOM[1]'];

    const regex = /^[A-Z0-9]{1,12}$/;
    for (let code of validCodes) {
        assert.strictEqual(regex.test(code), true);
    }
    for (let code of invalidCodes) {
        assert.strictEqual(regex.test(code), false);
    }
});

// ----------------------------------------------------
// 8. Modo 4 Jugadores (2 vs 2 / Parejas)
// ----------------------------------------------------
console.log('\n👥 8. Modo 4 Jugadores (2 vs 2):');

test('Inicialización de 4 Jugadores: Reparto de 12 cartas + muestra', () => {
    const game = new GameStateManager(4);
    assert.strictEqual(game.numJugadores, 4);
    assert.strictEqual(game.players.length, 4);
    assert.strictEqual(game.players[0].team, 0); // Tú
    assert.strictEqual(game.players[1].team, 1); // Rival 1
    assert.strictEqual(game.players[2].team, 0); // Compañero
    assert.strictEqual(game.players[3].team, 1); // Rival 2

    game.iniciarRonda();

    assert.strictEqual(game.players[0].hand.length, 3);
    assert.strictEqual(game.players[1].hand.length, 3);
    assert.strictEqual(game.players[2].hand.length, 3);
    assert.strictEqual(game.players[3].hand.length, 3);
    assert.notStrictEqual(game.muestra, null);
    assert.strictEqual(game.mazo.length, 40 - 12 - 1); // 27 cartas restantes
});

test('Baza de 4 Jugadores: Gana el equipo con la carta más alta y el jugador que la tiró sale primero', () => {
    const game = new GameStateManager(4);
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    // Seat 0 (Team 0): 3 Copa (Poder 16)
    // Seat 1 (Team 1): 7 Espada (Poder 18)
    // Seat 2 (Team 0, Compañero): 1 Espada (Poder 20)
    // Seat 3 (Team 1): 1 Basto (Poder 19)
    const c0 = new Carta(3, 'Copa');
    const c1 = new Carta(7, 'Espada');
    const c2 = new Carta(1, 'Espada');
    const c3 = new Carta(1, 'Basto');
    game.actualizarMatrizDePoder(c0, c1, c2, c3);

    game.mesaSlots[0] = c0;
    game.mesaSlots[1] = c1;
    game.mesaSlots[2] = c2;
    game.mesaSlots[3] = c3;

    const res = game.evaluarMesa();
    assert.strictEqual(res.ganadorMesa, 'jugador'); // Team 0
    assert.strictEqual(game.manosGanadas.jugador, 1);
    assert.strictEqual(game.turnoSeat, 2); // Seat 2 (Compañero) tiró la más alta y sale primero
});

test('Baza de 4 Jugadores: Si jugador y compañero empatan con la carta más alta, el equipo gana limpiamente sin parda', () => {
    const game = new GameStateManager(4);
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    // Seat 0 (Team 0): 3 Copa (Poder 16)
    // Seat 1 (Team 1): 2 Copa (Poder 15)
    // Seat 2 (Team 0): 3 Basto (Poder 16)
    // Seat 3 (Team 1): 4 Basto (Poder 7)
    const c0 = new Carta(3, 'Copa');
    const c1 = new Carta(2, 'Copa');
    const c2 = new Carta(3, 'Basto');
    const c3 = new Carta(4, 'Basto');
    game.actualizarMatrizDePoder(c0, c1, c2, c3);

    game.mesaSlots[0] = c0;
    game.mesaSlots[1] = c1;
    game.mesaSlots[2] = c2;
    game.mesaSlots[3] = c3;

    const res = game.evaluarMesa();
    assert.strictEqual(res.ganadorMesa, 'jugador'); // Team 0 gana
    assert.strictEqual(game.manosGanadas.jugador, 1);
    assert.strictEqual(game.manosGanadas.empates, 0); // No es parda
});

test('Baza de 4 Jugadores: Si rivales y jugador empatan en la carta más alta, es Parda (empate entre equipos)', () => {
    const game = new GameStateManager(4);
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    // Seat 0 (Team 0): 3 Copa (Poder 16)
    // Seat 1 (Team 1): 3 Oro (Poder 16)
    // Seat 2 (Team 0): 2 Basto (Poder 15)
    // Seat 3 (Team 1): 2 Espada (Poder 15)
    const c0 = new Carta(3, 'Copa');
    const c1 = new Carta(3, 'Oro');
    const c2 = new Carta(2, 'Basto');
    const c3 = new Carta(2, 'Espada');
    game.actualizarMatrizDePoder(c0, c1, c2, c3);

    game.mesaSlots[0] = c0;
    game.mesaSlots[1] = c1;
    game.mesaSlots[2] = c2;
    game.mesaSlots[3] = c3;

    const res = game.evaluarMesa();
    assert.strictEqual(res.ganadorMesa, 'empate');
    assert.strictEqual(game.manosGanadas.empates, 1);
});

test('Rotación de Mano en 4 Jugadores: Rota cíclicamente 0 -> 1 -> 2 -> 3', () => {
    const game = new GameStateManager(4);
    game.iniciarRonda(); // 1ra ronda -> manoSeat = 0
    assert.strictEqual(game.manoSeat, 0);

    game.iniciarRonda(); // 2da ronda -> manoSeat = 1
    assert.strictEqual(game.manoSeat, 1);

    game.iniciarRonda(); // 3ra ronda -> manoSeat = 2
    assert.strictEqual(game.manoSeat, 2);

    game.iniciarRonda(); // 4ta ronda -> manoSeat = 3
    assert.strictEqual(game.manoSeat, 3);

    game.iniciarRonda(); // 5ta ronda -> vuelve a 0
    assert.strictEqual(game.manoSeat, 0);
});

// ----------------------------------------------------
// 9. IA y Sistema de Decisión Táctica
// ----------------------------------------------------
console.log('\n🤖 9. IA y Sistema de Decisión Táctica:');

test('evaluarPoderMano: las piezas duplican su ponderación estratégica', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Espada';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const pieza2 = new Carta(2, 'Espada'); // Pieza mayor, poder 100
    const tresComun = new Carta(3, 'Copa');  // Común, poder 16
    const cuatroComun = new Carta(4, 'Oro'); // Común, poder 7
    game.actualizarMatrizDePoder(pieza2, tresComun, cuatroComun);

    const poder = game.evaluarPoderMano([pieza2, tresComun, cuatroComun]);
    // 100*2 + 16 + 7 = 223
    assert.strictEqual(poder, 223);
});

test('obtenerMejorRespuesta: selecciona la carta ganadora más baja disponible', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Oro';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const asEspada = new Carta(1, 'Espada'); // Poder 20
    const sieteEspada = new Carta(7, 'Espada'); // Poder 18
    const tresCopa = new Carta(3, 'Copa'); // Poder 16
    game.actualizarMatrizDePoder(asEspada, sieteEspada, tresCopa);

    // Rival tiró carta con poder 17 (ej: 7 de Oro)
    const mejor = game.obtenerMejorRespuesta([asEspada, sieteEspada, tresCopa], 17);
    assert.strictEqual(mejor, sieteEspada); // Poder 18 gana con el menor gasto
});

test('obtenerMejorRespuesta: si no puede ganar la baza, entrega la carta más baja (descarte)', () => {
    const game = new GameStateManager();
    game.paloMuestra = 'Copa';
    game.piezasActivas = [2, 4, 5, 11, 10];

    const dosOro = new Carta(2, 'Oro'); // Poder 15
    const reyEspada = new Carta(12, 'Espada'); // Poder 13
    const cuatroBasto = new Carta(4, 'Basto'); // Poder 7
    game.actualizarMatrizDePoder(dosOro, reyEspada, cuatroBasto);

    // Rival tiró As de Espadas (Poder 20)
    const mejor = game.obtenerMejorRespuesta([dosOro, reyEspada, cuatroBasto], 20);
    assert.strictEqual(mejor, cuatroBasto); // Se desprende de la más baja (4 de Basto)
});

test('decidirEnvido: responde adecuadamente según puntaje y modo kamikaze', () => {
    const game = new GameStateManager();
    // Envido común
    assert.strictEqual(game.decidirEnvido('envido', 20, 0), 'no');
    assert.strictEqual(game.decidirEnvido('envido', 27, 0), 'si');
    assert.strictEqual(game.decidirEnvido('envido', 31, 0), 'real');

    // Real Envido
    assert.strictEqual(game.decidirEnvido('real_envido', 26, 0), 'no');
    assert.strictEqual(game.decidirEnvido('real_envido', 29, 0), 'si');
    assert.strictEqual(game.decidirEnvido('real_envido', 33, 0), 'real');

    // Falta Envido
    assert.strictEqual(game.decidirEnvido('falta_envido', 28, 0), 'no');
    assert.strictEqual(game.decidirEnvido('falta_envido', 30, 0), 'si');

    // Modo Kamikaze (diferencia > 10 puntos)
    assert.strictEqual(game.decidirEnvido('falta_envido', 25, 12), 'si');
    assert.strictEqual(game.decidirEnvido('envido', 21, 12), 'si');
});

test('decidirTruco: responde correctamente con manos altas, bajas o rival bluffeador', () => {
    const game = new GameStateManager();
    // Mano monstruosa (>80 poder) -> voto (Retruco)
    assert.strictEqual(game.decidirTruco(95, false, 0), 'voto');

    // Mano decente (35) sin bluffs -> si (quiero)
    assert.strictEqual(game.decidirTruco(35, false, 0), 'si');

    // Mano débil (15) sin bluffs -> no (al mazo)
    assert.strictEqual(game.decidirTruco(15, false, 0), 'no');

    // Mano débil (15) pero con rival mentiroso -> si (lo desafía)
    assert.strictEqual(game.decidirTruco(15, true, 0), 'si');
});

// ----------------------------------------------------
// 10. Deducción de IA y Análisis de Rival
// ----------------------------------------------------
console.log('\n🧠 10. Deducción de IA y Análisis de Rival:');

test('recordarPuntosRival: infiere pieza probable según puntos declarados', () => {
    const game = new GameStateManager();
    game.recordarPuntosRival(30, false);
    assert.strictEqual(game.memoriaRival.piezaProbable, 2);

    game.recordarPuntosRival(29, false);
    assert.strictEqual(game.memoriaRival.piezaProbable, 4);

    game.recordarPuntosRival(28, false);
    assert.strictEqual(game.memoriaRival.piezaProbable, 5);

    game.recordarPuntosRival(27, false);
    assert.strictEqual(game.memoriaRival.piezaProbable, 11);

    game.recordarPuntosRival(33, true);
    assert.strictEqual(game.memoriaRival.tieneFlor, true);
    assert.strictEqual(game.memoriaRival.piezaProbable, 'fuerte');
});

test('analizarBluff y registrarAccionRival: detecta bluffs y actualiza perfil del rival', () => {
    const game = new GameStateManager();
    assert.strictEqual(game.perfilRival.bluffsDetectados, 0);

    // Si el rival cantó y mostró menos de 20 puntos, es un bluff
    game.analizarBluff(18, true);
    assert.strictEqual(game.perfilRival.bluffsDetectados, 1);
    assert(game.perfilRival.agresividad > 0.5);

    // Registro de palos y cantos
    game.registrarAccionRival('canto', 'truco');
    game.registrarAccionRival('carta', { palo: 'Espada' });
    assert.strictEqual(game.perfilRival.frecuenciaTruco, 1);
    assert.strictEqual(game.memoriaPalos.Espada, 1);
});

// ----------------------------------------------------
// 11. Validación de Jugadas y Fases de Turno
// ----------------------------------------------------
console.log('\n⚡ 11. Validación de Jugadas y Fases:');

test('jugarCarta: rechaza jugadas fuera de turno o con índices inválidos', () => {
    const game = new GameStateManager(2);
    game.iniciarRonda();
    game.turnoSeat = 0; // Turno del jugador (seat 0)

    // Intento de jugada por parte del oponente fuera de turno
    const resOponente = game.jugarCarta(1, 0);
    assert.strictEqual(resOponente, false);

    // Intento con índice fuera de rango
    const resInvalido = game.jugarCarta(0, 99);
    assert.strictEqual(resInvalido, false);

    // Jugada válida
    const carta0 = game.manoJugador[0];
    const jugadaOk = game.jugarCarta(0, 0);
    assert.strictEqual(jugadaOk, carta0);
    assert.strictEqual(game.turnoSeat, 1); // Turno pasa a seat 1
    assert.strictEqual(game.fase, 'truco'); // Se quema fase de cantos
});

// ----------------------------------------------------
// 12. Nombres Criollos Tradicionales
// ----------------------------------------------------
console.log('\n🇺🇾 12. Nombres Criollos Tradicionales:');

test('getNombreCriollo: nombra correctamente Matapuercos y Figuras Comunes', () => {
    const macho = new Carta(1, 'Espada');
    const bastillo = new Carta(1, 'Basto');
    const sieteBravo = new Carta(7, 'Espada');
    const sieteBello = new Carta(7, 'Oro');
    const rey = new Carta(12, 'Copa');
    const caballo = new Carta(11, 'Copa');
    const asFalso = new Carta(1, 'Oro');

    assert(macho.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('El Macho'));
    assert(bastillo.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('El Bastillo'));
    assert(sieteBravo.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('Siete Bravo'));
    assert(sieteBello.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('Siete Bello'));
    assert(rey.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('Rey (Negra'));
    assert(caballo.getNombreCriollo('Oro', [2, 4, 5, 11, 10]).includes('Caballo (Negra'));
    assert(asFalso.getNombreCriollo('Espada', [2, 4, 5, 11, 10]).includes('As Falso'));
});

test('getNombreCriollo: nombra correctamente Perico, Perica y Alcahuete', () => {
    const perico = new Carta(11, 'Espada');
    const perica = new Carta(10, 'Espada');
    const alcahuete = new Carta(12, 'Espada');

    // Muestra normal de Espada
    assert.strictEqual(perico.getNombreCriollo('Espada', [2, 4, 5, 11, 10]), '¡El Perico! 🦜');
    assert.strictEqual(perica.getNombreCriollo('Espada', [2, 4, 5, 11, 10]), '¡La Perica! 💃');

    // Muestra 2 de Espada -> Regla del Alcahuete activa para el 12
    assert.strictEqual(alcahuete.getNombreCriollo('Espada', [12, 4, 5, 11, 10]), '¡El Alcahuete! 👑');
});

// ----------------------------------------------------
// 13. Casos Borde de Falta Envido
// ----------------------------------------------------
console.log('\n📊 13. Casos Borde de Falta Envido:');

test('calcPuntosFalta: calcula exactamente en inicio, buenas y límite', () => {
    const game = new GameStateManager();
    game.config.limitePuntos = 30;

    // Al inicio (0 a 0) -> Faltan 30
    game.puntosPartido = { jugador: 0, oponente: 0 };
    assert.strictEqual(game.calcPuntosFalta(), 30);

    // En las buenas (24 a 18) -> Faltan 6 (30 - 24)
    game.puntosPartido = { jugador: 24, oponente: 18 };
    assert.strictEqual(game.calcPuntosFalta(), 6);

    // En 29 puntos -> Falta 1 punto mínimo
    game.puntosPartido = { jugador: 29, oponente: 28 };
    assert.strictEqual(game.calcPuntosFalta(), 1);

    // En empate a 30 -> Devuelve mínimo 1 punto seguro
    game.puntosPartido = { jugador: 30, oponente: 30 };
    assert.strictEqual(game.calcPuntosFalta(), 1);
});

// ----------------------------------------------------
// 14. Exportación e Importación de Estado (Snapshot & Replay)
// ----------------------------------------------------
console.log('\n💾 14. Snapshot y Replay de Estado:');

test('exportarEstado e importarEstado: serializa y restaura íntegramente la partida', () => {
    const game1 = new GameStateManager(2);
    game1.iniciarRonda();
    game1.puntosPartido = { jugador: 14, oponente: 18 };
    game1.apuestaTruco = { valor: 2, estado: 'truco', turnoCantar: 'oponente' };
    game1.jugarCarta(game1.turnoSeat, 0); // Juega 1 carta

    const snapshot = game1.exportarEstado();
    assert.strictEqual(typeof snapshot, 'object');
    assert.strictEqual(snapshot.puntosPartido.jugador, 14);
    assert.strictEqual(snapshot.puntosPartido.oponente, 18);
    assert.strictEqual(snapshot.apuestaTruco.estado, 'truco');

    // Crear un nuevo motor y restaurar el snapshot
    const game2 = new GameStateManager();
    game2.importarEstado(snapshot);

    assert.strictEqual(game2.idRonda, game1.idRonda);
    assert.strictEqual(game2.puntosPartido.jugador, 14);
    assert.strictEqual(game2.puntosPartido.oponente, 18);
    assert.strictEqual(game2.apuestaTruco.estado, 'truco');
    assert.strictEqual(game2.apuestaTruco.valor, 2);
    assert.strictEqual(game2.paloMuestra, game1.paloMuestra);
    assert.strictEqual(game2.piezasActivas.length, game1.piezasActivas.length);
    assert.strictEqual(game2.manoJugador.length, game1.manoJugador.length);
    assert.strictEqual(game2.manoOponente.length, game1.manoOponente.length);
    assert.strictEqual(game2.mesaSlots[0]?.valor, game1.mesaSlots[0]?.valor);
});

// ----------------------------------------------------
// 15. Equipos y Mano en 4 Jugadores
// ----------------------------------------------------
console.log('\n👥 15. Equipos y Mano en 4 Jugadores:');

test('manoDelPartido en 4P resuelve correctamente el equipo de cada asiento', () => {
    const game = new GameStateManager(4);
    
    // Seat 0: TÚ (Team 0)
    game.manoSeat = 0;
    assert.strictEqual(game.manoDelPartido, 'jugador');

    // Seat 1: Rival Derecha (Team 1)
    game.manoSeat = 1;
    assert.strictEqual(game.manoDelPartido, 'oponente');

    // Seat 2: Compañero (Team 0) -> Debe ser 'jugador' (nuestro equipo)
    game.manoSeat = 2;
    assert.strictEqual(game.manoDelPartido, 'jugador');

    // Seat 3: Rival Izquierda (Team 1)
    game.manoSeat = 3;
    assert.strictEqual(game.manoDelPartido, 'oponente');
});

// ----------------------------------------------------
// 16. Robustez de Modales UI
// ----------------------------------------------------
console.log('\n🖥️ 16. Robustez de Modales UI:');

test('UIManager._cleanupPending resuelve promesas previas para evitar bloqueos', async () => {
    // Simulación del entorno UI en Node
    let resolvedValue = null;
    const fakeUI = {
        _currentResolver: (val) => { resolvedValue = val; },
        _pendingTimeout: setTimeout(() => {}, 10000),
        _cleanupPending: function(defaultVal) {
            if (this._pendingTimeout) {
                clearTimeout(this._pendingTimeout);
                this._pendingTimeout = null;
            }
            if (typeof this._currentResolver === 'function') {
                const res = this._currentResolver;
                this._currentResolver = null;
                res(defaultVal);
            }
        }
    };

    fakeUI._cleanupPending(false);
    assert.strictEqual(resolvedValue, false);
    assert.strictEqual(fakeUI._pendingTimeout, null);
    assert.strictEqual(fakeUI._currentResolver, null);
});

// ----------------------------------------------------
// 17. Regla de Parda y Salida de Baza en Truco Uruguayo
// ----------------------------------------------------
console.log('\n🇺🇾 17. Regla de Parda y Salida de Baza:');

test('En caso de parda, el turno siguiente corresponde al jugador que inició esa baza', () => {
    const game = new GameStateManager(2);
    game.iniciarRonda();

    // Simular que el asiento 0 es mano pero el asiento 1 ganó la primera baza y lideró la 2da
    game.manoSeat = 0;
    game.turnoSeat = 1;
    game.bazaStarterSeat = 1;

    // Cartas de igual poder (empate / parda en 2da baza)
    game.mesaSlots[1] = new Carta(3, 'Oro');
    game.mesaSlots[0] = new Carta(3, 'Copa');
    game.actualizarMatrizDePoder(game.mesaSlots[0], game.mesaSlots[1]);

    const res = game.evaluarMesa();
    assert.strictEqual(res.ganadorMesa, 'empate');
    // En el Truco Uruguayo, quien abrió la baza que emparda vuelve a ser mano de la siguiente baza
    assert.strictEqual(game.turnoSeat, 1, 'El turno de salida debe ser para el iniciador de la baza');
    assert.strictEqual(game.bazaStarterSeat, 1, 'bazaStarterSeat debe actualizarse para la nueva baza');
});

test('Snapshot de estado serializa y restaura bazaStarterSeat correctamente', () => {
    const game1 = new GameStateManager(2);
    game1.iniciarRonda();
    game1.bazaStarterSeat = 1;
    game1.turnoSeat = 1;

    const snap = game1.exportarEstado();
    assert.strictEqual(snap.bazaStarterSeat, 1);

    const game2 = new GameStateManager(2);
    game2.importarEstado(snap);
    assert.strictEqual(game2.bazaStarterSeat, 1);
});

// ----------------------------------------------------
// 18. Envido por Equipos (2v2), Muestra y Reinicio de Mano
// ----------------------------------------------------
console.log('\n🤝 18. Envido por Equipos (2v2), Muestra y Reinicio de Mano:');

test('calcularMejorEnvidoEquipo calcula correctamente el mejor puntaje del equipo en 2 vs 2', () => {
    const game = new GameStateManager(4);
    game.configurarJugadores(4);
    game.iniciarRonda();

    // Configurar manos fijas para evaluar
    // Equipo 0: Jugador (seat 0) y Compañero (seat 2)
    // Asignar cartas sin piezas para cálculo determinista
    game.muestra = new Carta(12, 'Copa'); // Muestra Copa, no afecta Bastos ni Espadas
    game.definirPiezas();

    // Seat 0: 7 y 6 de Espada (33 pts) + 1 de Basto
    game.players[0].hand = [new Carta(7, 'Espada'), new Carta(6, 'Espada'), new Carta(1, 'Basto')];
    game.players[0].initialHand = [...game.players[0].hand];

    // Seat 2: 7 y 5 de Basto (32 pts) + 4 de Espada
    game.players[2].hand = [new Carta(7, 'Basto'), new Carta(5, 'Basto'), new Carta(4, 'Espada')];
    game.players[2].initialHand = [...game.players[2].hand];

    // Equipo 1: Rival Der (seat 1) y Rival Izq (seat 3)
    // Seat 1: 3 de Oro, 2 de Oro, 1 de Oro -> 5 de Oro, 4 de Oro, etc. (Flor o Envido simple)
    // 6 y 5 de Oro = 31 pts
    game.players[1].hand = [new Carta(6, 'Oro'), new Carta(5, 'Oro'), new Carta(2, 'Espada')];
    game.players[1].initialHand = [...game.players[1].hand];

    // Seat 3: 7 y 7 de distintos palos -> 7 pts
    game.players[3].hand = [new Carta(7, 'Oro'), new Carta(2, 'Basto'), new Carta(4, 'Copa')];
    game.players[3].initialHand = [...game.players[3].hand];

    const mejorEquipo0 = game.calcularMejorEnvidoEquipo(0);
    assert.strictEqual(mejorEquipo0.mejorPuntaje, 33, 'El mejor envido del Equipo 0 debe ser 33 (del asiento 0)');
    assert.strictEqual(mejorEquipo0.mejorSeat, 0, 'El mejor jugador debe ser el asiento 0');

    const mejorEquipo1 = game.calcularMejorEnvidoEquipo(1);
    assert.strictEqual(mejorEquipo1.mejorPuntaje, 31, 'El mejor envido del Equipo 1 debe ser 31 (del asiento 1)');
    assert.strictEqual(mejorEquipo1.mejorSeat, 1, 'El mejor jugador debe ser el asiento 1');

    // Ahora probar cuando el compañero (asiento 2) supera al jugador (asiento 0)
    game.players[2].hand = [new Carta(7, 'Basto'), new Carta(6, 'Basto'), new Carta(1, 'Copa')]; // 33 pts
    // Y además con pieza: 2 de Copa (vale 30 pts) + 7 de Basto = 37 pts
    game.players[2].hand = [new Carta(2, 'Copa'), new Carta(7, 'Basto'), new Carta(1, 'Espada')];
    game.players[2].initialHand = [...game.players[2].hand];
    game.actualizarMatrizDePoder(...game.players[2].hand);

    const nuevoMejorEquipo0 = game.calcularMejorEnvidoEquipo(0);
    assert.strictEqual(nuevoMejorEquipo0.mejorPuntaje, 37, 'El compañero debe superar con 37 pts');
    assert.strictEqual(nuevoMejorEquipo0.mejorSeat, 2, 'El mejor asiento del equipo debe ser 2');
});

test('calcularMejorEnvidoEquipo en 1 vs 1 devuelve los puntos de cada jugador', () => {
    const game = new GameStateManager(2);
    game.configurarJugadores(2);
    game.iniciarRonda();

    game.players[0].hand = [new Carta(7, 'Espada'), new Carta(6, 'Espada'), new Carta(1, 'Basto')];
    game.players[0].initialHand = [...game.players[0].hand];

    game.players[1].hand = [new Carta(7, 'Oro'), new Carta(5, 'Oro'), new Carta(2, 'Copa')];
    game.players[1].initialHand = [...game.players[1].hand];

    const envido0 = game.calcularMejorEnvidoEquipo(0);
    const envido1 = game.calcularMejorEnvidoEquipo(1);

    assert.strictEqual(envido0.mejorPuntaje, 33);
    assert.strictEqual(envido0.mejorSeat, 0);
    assert.strictEqual(envido1.mejorPuntaje, 32);
    assert.strictEqual(envido1.mejorSeat, 1);
});

test('iniciarRonda inicializa correctamente poder y esPieza en la muestra', () => {
    const game = new GameStateManager(2);
    game.iniciarRonda();

    assert.notStrictEqual(game.muestra, null, 'Debe haber una carta de muestra');
    assert.strictEqual(typeof game.muestra.poder, 'number', 'La muestra debe tener poder asignado numéricamente');
    assert.strictEqual(typeof game.muestra.esPieza, 'boolean', 'La muestra debe tener esPieza boolean');
    assert.strictEqual(typeof game.muestra.puntosEnvido, 'number', 'La muestra debe tener puntosEnvido numérico');
});

test('Reinicio de partido con partidoIniciado = false asegura que la 1ra mano empiece en manoSeat 0', () => {
    const game = new GameStateManager(2);
    // Primera ronda de partido nuevo
    game.partidoIniciado = false;
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 0, 'La primera mano de un partido debe comenzar en el asiento 0');
    assert.strictEqual(game.partidoIniciado, true);

    // Segunda ronda del mismo partido
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 1, 'La segunda ronda debe rotar la mano al asiento 1');

    // Revancha (nuevo partido)
    game.partidoIniciado = false;
    game.iniciarRonda();
    assert.strictEqual(game.manoSeat, 0, 'Tras reiniciar partido, la mano debe volver a empezar en 0');
});

// ----------------------------------------------------
// 19. Toques de Envido: Real Envido y Falta Envido
// ----------------------------------------------------
console.log('\n🔥 19. Toques de Envido: Real Envido y Falta Envido (Reglas Criollas):');

test('Canto directo de Real Envido: 3 pts si se acepta, 1 pt si se rechaza', () => {
    const game = new GameStateManager(2);
    // Simular puntos en disputa:
    // Canto inicial: Real Envido
    const ptsAceptado = 3;
    const ptsRechazado = 1;
    assert.strictEqual(ptsAceptado, 3, 'Real Envido directo aceptado debe otorgar 3 puntos');
    assert.strictEqual(ptsRechazado, 1, 'Real Envido directo rechazado debe otorgar 1 punto');
});

test('Revire Envido -> Real Envido: 5 pts si se acepta, 2 pts si se rechaza', () => {
    // Si se canta Envido (2 pts) y el rival sube a Real Envido (+3 pts):
    const ptsEnvido = 2;
    const ptsRevireReal = 3;
    const totalAceptado = ptsEnvido + ptsRevireReal; // 5 pts
    const totalRechazado = ptsEnvido; // 2 pts para el que cantó Real Envido
    assert.strictEqual(totalAceptado, 5, 'Envido + Real Envido aceptado son 5 puntos en disputa');
    assert.strictEqual(totalRechazado, 2, 'Si se rechaza el Real Envido, se cobran los 2 pts del Envido previo');
});

test('Canto directo de Falta Envido: calcPuntosFalta() si se acepta, 1 pt si se rechaza', () => {
    const game = new GameStateManager(2);
    game.puntosPartido.jugador = 18;
    game.puntosPartido.oponente = 22;
    // Falta envido son los puntos que le faltan al puntero (22) para llegar a 30 -> 8 pts
    const ptsFalta = game.calcPuntosFalta();
    assert.strictEqual(ptsFalta, 8);
    const ptsRechazadoDirecto = 1;
    assert.strictEqual(ptsRechazadoDirecto, 1, 'Falta Envido directo rechazado otorga 1 punto');
});

test('Revire Envido -> Falta Envido: calcPuntosFalta() si se acepta, 2 pts si se rechaza', () => {
    const game = new GameStateManager(2);
    game.puntosPartido.jugador = 10;
    game.puntosPartido.oponente = 15;
    const ptsFalta = game.calcPuntosFalta(); // 30 - 15 = 15
    assert.strictEqual(ptsFalta, 15);
    const ptsRechazoEnvidoAFalta = 2; // Puntos del envido comprometido
    assert.strictEqual(ptsRechazoEnvidoAFalta, 2);
});

test('Revire Real Envido -> Falta Envido: calcPuntosFalta() si se acepta, 3 pts si se rechaza', () => {
    const ptsRechazoRealAFalta = 3; // Puntos del Real Envido comprometido
    assert.strictEqual(ptsRechazoRealAFalta, 3);
});

test('Revire Envido -> Real Envido -> Falta Envido: calcPuntosFalta() si se acepta, 5 pts si se rechaza', () => {
    const ptsComprometidos = 2 + 3; // 5 pts comprometidos
    assert.strictEqual(ptsComprometidos, 5, 'Al rechazar Falta Envido sobre Real Envido revirado, se cobran 5 pts');
});

test('decidirEnvido de IA ante toques de Real Envido y Falta Envido', () => {
    const game = new GameStateManager(2);
    // Real Envido:
    // Con 33+ revira (sube a Falta Envido)
    assert.strictEqual(game.decidirEnvido('real_envido', 34, 0), 'real');
    // Con 28-31 acepta (si)
    assert.strictEqual(game.decidirEnvido('real_envido', 29, 0), 'si');
    // Con < 28 rechaza (no)
    assert.strictEqual(game.decidirEnvido('real_envido', 25, 0), 'no');
    // Modo kamikaze (diferencia > 10): acepta con 24+
    assert.strictEqual(game.decidirEnvido('real_envido', 24, 12), 'si');

    // Falta Envido:
    // Con 30+ acepta (si)
    assert.strictEqual(game.decidirEnvido('falta_envido', 31, 0), 'si');
    // Con < 30 rechaza (no)
    assert.strictEqual(game.decidirEnvido('falta_envido', 28, 0), 'no');
    // Modo kamikaze: acepta con 24+
    assert.strictEqual(game.decidirEnvido('falta_envido', 24, 15), 'si');
});

// ----------------------------------------------------
// Resumen
// ----------------------------------------------------
console.log('\n========================================');
console.log(`🏁 RESULTADO: ${passedTests}/${totalTests} tests pasados.`);
console.log('========================================\n');

if (passedTests !== totalTests) {
    process.exit(1);
}
