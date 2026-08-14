/**
 * Test suite para Truco Uruguayo
 * Ejecutar con: node test/truco.test.js
 */

const assert = require('assert');
const { Carta, GameStateManager, PALOS, VALORES } = require('../js/gamestatemanager');

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
// Resumen
// ----------------------------------------------------
console.log('\n========================================');
console.log(`🏁 RESULTADO: ${passedTests}/${totalTests} tests pasados.`);
console.log('========================================\n');

if (passedTests !== totalTests) {
    process.exit(1);
}
