/**
 * Test E2E en Navegador Real (Chromium / Playwright)
 * Valida la interfaz gráfica, clics, inicio de 1v1 y 2v2, y responsividad en celulares.
 * Ejecutar con: npm run test:browser
 */

const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('\n======================================================');
    console.log('🌐 INICIANDO TESTS E2E EN NAVEGADOR (CHROMIUM / PLAYWRIGHT)');
    console.log('======================================================\n');

    let browser;
    let passed = 0;
    let total = 0;

    async function runTest(name, fn) {
        total++;
        try {
            await fn();
            passed++;
            console.log('  ✅ ' + name);
        } catch (err) {
            console.error('  ❌ ' + name);
            console.error('     ' + (err.stack || err.message));
        }
    }

    try {
        browser = await chromium.launch({ headless: true });
        const filePath = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

        // TEST 1: Carga de Pantalla de Inicio
        await runTest('Pantalla de inicio carga correctamente y opciones son visibles', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.waitForSelector('#pantalla-inicio');

            const isVisible = await page.isVisible('#pantalla-inicio');
            assert.strictEqual(isVisible, true, 'La pantalla de inicio debe ser visible al cargar');

            const title = await page.textContent('#pantalla-inicio h1');
            assert(title.includes('Truco Uruguayo'), 'El título debe estar presente');
            await page.close();
        });

        // TEST 2: Iniciar Modo 1 vs 1
        await runTest('Clic en "1 vs 1" inicia la partida, oculta pantalla de inicio y muestra cartas', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            
            // Clic en la tarjeta de 1 vs 1
            await page.click('text=1 vs 1');

            // Esperar que la pantalla de inicio se oculte
            await page.waitForFunction(() => {
                const el = document.getElementById('pantalla-inicio');
                return el && (el.style.display === 'none' || window.getComputedStyle(el).display === 'none');
            }, { timeout: 5000 });

            // Esperar animación de reparto
            await page.waitForTimeout(1500);

            // Verificar que hay 3 cartas en la mano del jugador
            const cartasJugador = await page.$$('.player-hand .card');
            assert.strictEqual(cartasJugador.length, 3, 'El jugador debe recibir exactamente 3 cartas');

            // Verificar que el mazo y la muestra están en la mesa
            const mazoVisible = await page.isVisible('.card-deck');
            assert.strictEqual(mazoVisible, true, 'El mazo debe estar visible');

            const muestraVisible = await page.isVisible('.card-muestra');
            assert.strictEqual(muestraVisible, true, 'La muestra debe estar visible');

            // Si saltó alerta de Flor automática, cerrarla
            const isModalVisible = await page.isVisible('#modal-custom');
            if (isModalVisible) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(400);
            }

            // Simular jugar una carta (clic en la primera carta)
            const freshCards = await page.$$('.player-hand .card');
            if (freshCards.length > 0) {
                await freshCards[0].click();
                await page.waitForTimeout(800);
            }

            // Verificar que la carta pasó a la mesa o que quedan 2 cartas en mano
            const cartasRestantes = await page.$$('.player-hand .card');
            assert.strictEqual(cartasRestantes.length, 2, 'Debe quedar con 2 cartas tras jugar una');
            await page.close();
        });

        // TEST 3: Iniciar Modo 2 vs 2 (Parejas)
        await runTest('Clic en "2 vs 2" inicia modo 4 jugadores y muestra las 4 posiciones', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            
            // Clic en la tarjeta de 2 vs 2
            await page.click('text=2 vs 2');

            // Esperar que la pantalla de inicio se oculte
            await page.waitForFunction(() => {
                const el = document.getElementById('pantalla-inicio');
                return el && (el.style.display === 'none' || window.getComputedStyle(el).display === 'none');
            }, { timeout: 5000 });

            // Esperar animación de reparto
            await page.waitForTimeout(2500);

            // Verificar que las manos de los 4 jugadores existen
            const hand0 = await page.$$('.player-hand .card');
            const handPartner = await page.$$('.partner-hand .card');
            const handRivalR = await page.$$('.rival-right-hand .card');
            const handRivalL = await page.$$('.rival-left-hand .card');

            assert.strictEqual(hand0.length, 3, 'Jugador (Sur) debe tener 3 cartas');
            assert.strictEqual(handPartner.length, 3, 'Compañero (Norte) debe tener 3 cartas');
            assert.strictEqual(handRivalR.length, 3, 'Rival Derecha (Este) debe tener 3 cartas');
            assert.strictEqual(handRivalL.length, 3, 'Rival Izquierda (Oeste) debe tener 3 cartas');

            // Verificar que el área de juego 4P está activa
            const playArea4PVisible = await page.isVisible('#play-area-4p');
            assert.strictEqual(playArea4PVisible, true, 'La mesa de 4 ranuras debe estar visible');
            await page.close();
        });

        // TEST 4: Vista Móvil Vertical (iPhone SE, iPhone 14, Android)
        await runTest('Prueba en resolución Mobile vertical (iPhone/Android: cartas grandes, elevadas y menú de voces flotante)', async () => {
            const devices = [
                { name: 'iPhone SE', width: 375, height: 667 },
                { name: 'iPhone 14', width: 390, height: 844 },
                { name: 'Pixel 7', width: 412, height: 915 }
            ];

            for (const dev of devices) {
                const page = await browser.newPage({
                    viewport: { width: dev.width, height: dev.height },
                    isMobile: true,
                    hasTouch: true
                });
                await page.route('**/*.firebaseio.com/**', route => route.abort());
                await page.goto(filePath);

                // Clic en 1 vs 1 en móvil
                await page.click('text=1 vs 1');
                await page.waitForFunction(() => {
                    const el = document.getElementById('pantalla-inicio');
                    return el && (el.style.display === 'none' || window.getComputedStyle(el).display === 'none');
                }, { timeout: 5000 });
                await page.waitForTimeout(1500);

                // Si saltó modal de Flor, cerrarlo
                const isModal = await page.isVisible('#modal-custom');
                if (isModal) {
                    const btnOk = await page.$('#modal-buttons button');
                    if (btnOk) await btnOk.click();
                    await page.waitForTimeout(300);
                }

                // 1. Panel de acciones flotante y elevado del fondo
                const actionsPanel = await page.waitForSelector('#actions-panel');
                const actionsBox = await actionsPanel.boundingBox();
                assert(actionsBox, `El panel de voces debe ser visible en ${dev.name}`);
                assert(actionsBox.y + actionsBox.height <= dev.height, `El panel de acciones debe caber en la pantalla en ${dev.name}`);

                // 2. Cartas del jugador grandes y elevadas
                const cards = await page.$$('.player-hand .card');
                assert.strictEqual(cards.length, 3, `Debe haber 3 cartas en ${dev.name}`);
                const cardBoxes = await Promise.all(cards.map(c => c.boundingBox()));

                // Ancho de cartas aumentado (>= 110px) y altura >= 165px
                assert(cardBoxes[0].width >= 110, `Las cartas deben ser grandes (>= 110px de ancho) en ${dev.name}, midió ${cardBoxes[0].width}`);
                assert(cardBoxes[0].height >= 165, `Las cartas deben ser altas (>= 165px) en ${dev.name}, midió ${cardBoxes[0].height}`);

                // No desbordan horizontalmente la pantalla
                assert(cardBoxes[0].x >= -5, `Primera carta no debe salirse a la izquierda en ${dev.name}`);
                const lastCard = cardBoxes[cardBoxes.length - 1];
                assert(lastCard.x + lastCard.width <= dev.width + 10, `Última carta no debe salirse a la derecha en ${dev.name}`);

                // Espacio libre y elevación respecto al panel de acciones
                const bottomOfCards = Math.max(...cardBoxes.map(b => b.y + b.height));
                const clearance = actionsBox.y - bottomOfCards;
                assert(clearance >= 10, `Debe existir separación limpia entre cartas y panel de voces en ${dev.name}, clearance=${clearance}`);

                await page.close();
            }
        });

        // TEST 5: Modales de Señas, Jerarquía y Reglamento
        await runTest('Apertura y navegación fluida de Modales de Señas, Jerarquía y Reglamento', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Abrir modal de señas
            const btnSenas = page.locator('#btn-senas');
            if (await btnSenas.isVisible()) {
                await btnSenas.click();
                const modalSenas = page.locator('#modal-senas');
                assert.strictEqual(await modalSenas.isVisible(), true, 'El modal de señas debe ser visible');

                // Ir a Reglamento desde señas
                const btnReglamento = page.locator('#btn-ver-reglamento');
                if (await btnReglamento.isVisible()) {
                    await btnReglamento.click();
                    const modalReglamento = page.locator('#modal-reglamento');
                    assert.strictEqual(await modalReglamento.isVisible(), true, 'El modal de reglamento debe ser visible');

                    // Cerrar reglamento
                    await page.click('#btn-cerrar-reglamento');
                    assert.strictEqual(await modalReglamento.isVisible(), false, 'El modal de reglamento debe cerrarse');
                }
            }
            await page.close();
        });

        // TEST 6: Modal de Configuración y Personalización
        await runTest('Modal de Configuración permite ajustar nombres y límites', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Abrir configuración
            await page.evaluate(() => window.abrirConfig && window.abrirConfig());
            const modalConfig = page.locator('#modal-config');
            assert.strictEqual(await modalConfig.isVisible(), true, 'El modal de config debe estar abierto');

            // Modificar inputs
            await page.fill('#config-name-yo', 'Capitán');
            await page.evaluate(() => window.guardarConfig && window.guardarConfig());

            assert.strictEqual(await modalConfig.isVisible(), false, 'El modal de config debe cerrarse al guardar');
            const yoName = await page.textContent('#mini-name-yo');
            assert.strictEqual(yoName, 'Capitán', 'El nombre del jugador debe haberse actualizado a Capitán');
            await page.close();
        });

        // TEST 7: Visual Fan Layout de las cartas del jugador
        await runTest('Cartas del jugador se presentan en abanico (izquierda inclinada, centro vertical, derecha inclinada)', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Obtener las 3 cartas de la mano del jugador
            const cartas = await page.$$('.player-hand .card');
            assert.strictEqual(cartas.length, 3, 'Debe haber 3 cartas en la mano');

            // Verificar clases de abanico fan-3-0, fan-3-1, fan-3-2
            const cls0 = await cartas[0].getAttribute('class');
            const cls1 = await cartas[1].getAttribute('class');
            const cls2 = await cartas[2].getAttribute('class');

            assert(cls0.includes('fan-3-0'), 'La carta izquierda debe tener clase fan-3-0');
            assert(cls1.includes('fan-3-1'), 'La carta central debe tener clase fan-3-1');
            assert(cls2.includes('fan-3-2'), 'La carta derecha debe tener clase fan-3-2');

            // Verificar transformaciones CSS computadas
            const transforms = await page.evaluate(() => {
                const els = document.querySelectorAll('.player-hand .card');
                return Array.from(els).map(el => window.getComputedStyle(el).transform);
            });
            assert.strictEqual(transforms.length, 3);
            await page.close();
        });

        // TEST 8: Arrastre con clic izquierdo reordena las cartas
        await runTest('Arrastre con botón izquierdo del mouse reordena las cartas en mano', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Cerrar cualquier modal que haya saltado (ej. Flor)
            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(400);
            }

            // Identificar cartas antes del arrastre
            const ordenInicial = await page.evaluate(() => {
                return window.game.players[0].hand.map(c => `${c.valor}_${c.palo}`);
            });
            assert.strictEqual(ordenInicial.length, 3);

            // Obtener bounding boxes de la carta del medio (índice 1) y de la izquierda (índice 0)
            const cartas = await page.$$('.player-hand .card');
            const box0 = await cartas[0].boundingBox();
            const box1 = await cartas[1].boundingBox();

            assert(box0 && box1, 'Las cartas deben tener dimensiones válidas');

            // Arrastrar la carta del medio (box1) hacia la posición de la izquierda (box0)
            await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
            await page.mouse.down({ button: 'left' });
            await page.waitForTimeout(100);

            // Mover hacia la izquierda
            await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up({ button: 'left' });
            await page.waitForTimeout(400);

            // Verificar que el orden en el estado y DOM cambió: la que estaba en medio ahora está a la izquierda
            const ordenNuevo = await page.evaluate(() => {
                return window.game.players[0].hand.map(c => `${c.valor}_${c.palo}`);
            });

            assert.strictEqual(ordenNuevo[0], ordenInicial[1], 'La carta del medio ahora debe ser la de la izquierda');
            assert.strictEqual(ordenNuevo[1], ordenInicial[0], 'La carta de la izquierda ahora debe estar en el medio');
            assert.strictEqual(ordenNuevo[2], ordenInicial[2], 'La carta derecha debe permanecer igual');
            await page.close();
        });

        // TEST 9: Visual Fan Layout de las cartas del rival y separación del mazo con la muestra
        await runTest('Cartas del rival se presentan inclinadas en abanico y el mazo no solapa las cartas', async () => {
            const page = await browser.newPage({
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true
            });
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2500);

            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(300);
            }

            // 1. Verificar clases de abanico en las cartas del rival
            const oppCards = await page.$$('.opponent-hand .card');
            assert.strictEqual(oppCards.length, 3, 'El rival debe tener 3 cartas');

            const cls0 = await oppCards[0].getAttribute('class');
            const cls1 = await oppCards[1].getAttribute('class');
            const cls2 = await oppCards[2].getAttribute('class');

            assert(cls0.includes('fan-3-0'), 'La carta izquierda del rival debe tener clase fan-3-0');
            assert(cls1.includes('fan-3-1'), 'La carta central del rival debe tener clase fan-3-1');
            assert(cls2.includes('fan-3-2'), 'La carta derecha del rival debe tener clase fan-3-2');

            // 2. Separación vertical limpia entre mano del rival y el mazo con la muestra
            const metrics = await page.evaluate(() => {
                const opp = document.querySelector('.opponent-hand').getBoundingClientRect();
                const deck = document.querySelector('.deck-area').getBoundingClientRect();
                const muestra = document.querySelector('.card-muestra').getBoundingClientRect();
                return {
                    gapOppToDeck: deck.top - opp.bottom,
                    gapOppToMuestra: muestra.top - opp.bottom
                };
            });

            assert(metrics.gapOppToDeck >= 5, `El mazo debe ubicarse más abajo sin solapar al rival (gap: ${metrics.gapOppToDeck}px)`);
            assert(metrics.gapOppToMuestra >= 5, `La muestra debe ubicarse más abajo sin solapar al rival (gap: ${metrics.gapOppToMuestra}px)`);

            // 3. Verificar que al quedar 2 cartas se mantiene el abanico fan-2
            await page.evaluate(() => {
                window.game.players[1].hand = window.game.players[1].hand.slice(0, 2);
                window.renderJuego();
            });
            await page.waitForTimeout(200);
            const remaining2 = await page.$$('.opponent-hand .card');
            assert.strictEqual(remaining2.length, 2);
            const remCls0 = await remaining2[0].getAttribute('class');
            const remCls1 = await remaining2[1].getAttribute('class');
            assert(remCls0.includes('fan-2-0') && remCls1.includes('fan-2-1'), 'Con 2 cartas el rival debe tener clases fan-2');

            await page.close();
        });

        // TEST 10: Botón de Repartir / Siguiente Mano nunca se muestra durante una ronda activa
        await runTest('Botón de Repartir / Siguiente Mano nunca está visible en ronda activa y se oculta al jugar', async () => {
            const page = await browser.newPage({
                viewport: { width: 1280, height: 800 }
            });
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2500);

            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(300);
            }

            // 1. Durante la ronda activa, el botón de repartir debe estar 100% oculto
            const btnRepartirVisible1 = await page.isVisible('#btn-repartir');
            assert.strictEqual(btnRepartirVisible1, false, 'El botón de repartir NO debe ser visible durante la ronda');

            // 2. Invocar renderJuego explícitamente no debe activar el botón
            await page.evaluate(() => {
                window.renderJuego();
            });
            const btnRepartirVisible2 = await page.isVisible('#btn-repartir');
            assert.strictEqual(btnRepartirVisible2, false, 'renderJuego no debe mostrar el botón mientras rondaTerminada es false');

            // 3. Simular fin de ronda legítimo y verificar que aparece con el texto correcto
            await page.evaluate(async () => {
                window.game.rondaTerminada = true;
                await window.manejarFinDeRondaUI();
            });
            await page.waitForTimeout(200);

            const btnRepartirVisible3 = await page.isVisible('#btn-repartir');
            assert.strictEqual(btnRepartirVisible3, true, 'El botón de siguiente mano debe ser visible al terminar la ronda');

            const btnText = await page.innerText('#btn-repartir');
            assert(btnText.toLowerCase().includes('siguiente mano'), `El botón debe decir 'Siguiente Mano' (texto actual: '${btnText}')`);

            // 4. Al hacer clic en el botón, debe ocultarse de inmediato y comenzar la nueva ronda
            await page.click('#btn-repartir');
            await page.waitForTimeout(100);

            const btnRepartirVisible4 = await page.isVisible('#btn-repartir');
            assert.strictEqual(btnRepartirVisible4, false, 'El botón debe ocultarse inmediatamente al hacer clic');

            // Esperar animación de reparto y verificar que sigue oculto durante la nueva ronda
            await page.waitForTimeout(2000);
            const btnRepartirVisible5 = await page.isVisible('#btn-repartir');
            assert.strictEqual(btnRepartirVisible5, false, 'El botón debe permanecer oculto durante la nueva ronda');

            await page.close();
        });

    } finally {
        if (browser) await browser.close();
    }

    console.log('\n======================================================');
    console.log(`🏁 RESULTADO BROWSER: ${passed}/${total} tests pasados con éxito.`);
    console.log('======================================================\n');

    if (passed !== total) {
        process.exit(1);
    }
})();
