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

                // 2. Cartas del jugador con tamaño compacto, juntas y lejos de los bordes de la pantalla
                const cards = await page.$$('.player-hand .card');
                assert.strictEqual(cards.length, 3, `Debe haber 3 cartas en ${dev.name}`);
                const cardBoxes = await Promise.all(cards.map(c => c.boundingBox()));

                // Ancho compacto de la carta central vertical (entre 90px y 112px) y altura >= 140px
                assert(cardBoxes[1].width >= 90 && cardBoxes[1].width <= 112, `Las cartas deben tener ancho compacto ideal (90-112px) en ${dev.name}, midió ${cardBoxes[1].width}`);
                assert(cardBoxes[1].height >= 140, `Las cartas deben tener buena altura (>= 140px) en ${dev.name}, midió ${cardBoxes[1].height}`);

                // Lejos de los bordes de la pantalla (al menos 35px de margen a cada lado)
                assert(cardBoxes[0].x >= 35, `Primera carta debe quedar lejos del borde izquierdo (>= 35px) en ${dev.name}, midió ${cardBoxes[0].x}`);
                const lastCard = cardBoxes[cardBoxes.length - 1];
                assert(dev.width - (lastCard.x + lastCard.width) >= 35, `Última carta debe quedar lejos del borde derecho (>= 35px) en ${dev.name}, margen=${dev.width - (lastCard.x + lastCard.width)}`);

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

            // Abrir menú hamburguesa en la esquina superior derecha y acceder a señas
            const btnMenu = page.locator('#btn-menu-hamburguesa');
            if (await btnMenu.isVisible()) {
                await btnMenu.click();
                await page.waitForTimeout(200);
            }
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

            // 2. Separación limpia entre mano del rival, mazo con la muestra, y mesa; además muestra más arriba con mazo encima y perspectiva 1ra persona
            await page.click('.player-hand .card:first-child');
            await page.waitForTimeout(800);

            const metrics = await page.evaluate(() => {
                const opp = document.querySelector('.opponent-hand').getBoundingClientRect();
                const deck = document.querySelector('.card-deck').getBoundingClientRect();
                const muestraEl = document.querySelector('.card-muestra');
                const deckEl = document.querySelector('.card-deck');
                const muestra = muestraEl.getBoundingClientRect();
                const playArea = document.querySelector('.play-area').getBoundingClientRect();
                const playerCard = document.querySelector('.player-hand .card');
                const tableCard = document.querySelector('.play-area .card');
                const oppCard = document.querySelector('.opponent-hand .card');

                const zDeck = parseInt(window.getComputedStyle(deckEl).zIndex, 10) || 0;
                const zMuestra = parseInt(window.getComputedStyle(muestraEl).zIndex, 10) || 0;

                const overlapRect = (r1, r2) => !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);

                return {
                    gapOppToDeck: deck.top - opp.bottom,
                    gapOppToMuestra: muestra.top - opp.bottom,
                    muestraAboveDeck: deck.top - muestra.top,
                    zDeck,
                    zMuestra,
                    deckOverlapsPlayArea: overlapRect(deck, playArea) || overlapRect(muestra, playArea),
                    playerW: playerCard ? parseFloat(window.getComputedStyle(playerCard).width) : 0,
                    tableW: tableCard ? parseFloat(window.getComputedStyle(tableCard).width) : 0,
                    oppW: oppCard ? parseFloat(window.getComputedStyle(oppCard).width) : 0,
                    deckW: parseFloat(window.getComputedStyle(deckEl).width)
                };
            });

            assert(metrics.gapOppToDeck >= 5, `El mazo debe ubicarse más abajo sin solapar al rival (gap: ${metrics.gapOppToDeck}px)`);
            assert(metrics.gapOppToMuestra >= 5, `La muestra debe ubicarse más abajo sin solapar al rival (gap: ${metrics.gapOppToMuestra}px)`);
            assert(metrics.muestraAboveDeck >= 12, `La muestra debe sobresalir hacia arriba respecto al mazo (>= 12px, midió ${metrics.muestraAboveDeck}px)`);
            assert(metrics.zDeck > metrics.zMuestra, `El mazo (z=${metrics.zDeck}) debe estar por encima de la muestra (z=${metrics.zMuestra})`);
            assert.strictEqual(metrics.deckOverlapsPlayArea, false, 'El mazo y la muestra no deben solaparse con el área de juego central');
            assert(metrics.playerW > metrics.tableW && metrics.tableW > metrics.oppW && metrics.oppW >= metrics.deckW,
                `Jerarquía de perspectiva en 1ra persona debe cumplirse: Jugador(${metrics.playerW}) > Mesa(${metrics.tableW}) > Rival(${metrics.oppW}) >= Mazo(${metrics.deckW})`);

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

        // TEST 11: Sistema de Chat en Vivo, Reacciones Rápidas, Burbujas Flotantes y Punto de Estado
        await runTest('Cajón de Chat y Voz: oculto al inicio (no en el fondo de la mesa), abre/cierra como overlay fijo, envía reacciones y mensajes', async () => {
            const page = await browser.newPage({
                viewport: { width: 1280, height: 800 }
            });
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);

            // Antes de iniciar partida: tanto el botón flotante como el cajón de chat deben estar ocultos
            const drawerVisibleOnStart = await page.isVisible('#chat-drawer');
            assert.strictEqual(drawerVisibleOnStart, false, 'El cajón de chat debe estar oculto en la pantalla de inicio');

            await page.click('text=1 vs 1');
            await page.waitForTimeout(1800);

            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(300);
            }

            // Al iniciar la partida, el cajón de chat debe seguir oculto (NUNCA renderizado en el fondo de la mesa)
            const drawerStateBeforeClick = await page.evaluate(() => {
                const drawer = document.getElementById('chat-drawer');
                const table = document.getElementById('game-table');
                const cs = window.getComputedStyle(drawer);
                return {
                    display: cs.display,
                    position: cs.position,
                    insideTable: table ? table.contains(drawer) : false
                };
            });
            assert.strictEqual(drawerStateBeforeClick.display, 'none', 'El cajón de chat debe tener display:none hasta que se abra');
            assert.strictEqual(drawerStateBeforeClick.insideTable, false, 'El cajón de chat debe estar fuera de #game-table para no afectar el paño');

            // 0. Verificar que el botón de chat en la barra superior tiene solo ícono y no texto "Chat"
            const topChatBtnText = await page.textContent('#btn-chat-toggle-inner');
            assert(topChatBtnText.includes('💬'), 'El botón superior de chat debe contener el emoji 💬');
            assert(!topChatBtnText.includes('Chat'), 'El botón superior de chat NO debe contener la palabra "Chat"');

            // 1. Verificar que el botón flotante de chat está visible en escritorio y con punto verde
            const floatingBtnVisible = await page.isVisible('#floating-chat-btn');
            assert.strictEqual(floatingBtnVisible, true, 'El botón flotante de chat debe estar visible en partida');

            const dotClassesInitial = await page.getAttribute('#chat-status-dot', 'class');
            assert(dotClassesInitial.includes('dot-verde'), 'El punto de estado inicial debe ser verde (dot-verde)');

            // 2. Simular llegada de un mensaje remoto con el cajón cerrado -> punto amarillo + badge
            await page.evaluate(() => {
                window.ChatManager.recibirMensajeRemoto({
                    id: 'msg_test_remoto_1',
                    autor: 'Rival Charrúa',
                    asiento: 1,
                    rol: 'invitado',
                    texto: '¡Cantá si tenés con qué, bo!',
                    tipo: 'texto',
                    timestamp: Date.now()
                });
            });
            await page.waitForTimeout(200);

            const dotClassesUnread = await page.getAttribute('#chat-status-dot', 'class');
            assert(dotClassesUnread.includes('dot-amarillo'), 'El punto de estado debe pasar a amarillo al recibir mensaje sin leer');

            const unreadText = await page.textContent('#chat-unread-badge');
            assert.strictEqual(unreadText.trim(), '1', 'El badge de no leídos debe mostrar 1');

            // Verificar que apareció burbuja flotante en la mesa
            const speechPops = await page.$$('#floating-speech-bubbles-container .speech-bubble-pop');
            assert(speechPops.length >= 1, 'Debe mostrarse la burbuja flotante sobre la mesa');

            // 3. Abrir el cajón de chat y verificar que limpia no leídos y vuelve a verde
            await page.click('#floating-chat-btn');
            await page.waitForTimeout(200);

            const drawerVisible = await page.isVisible('#chat-drawer');
            assert.strictEqual(drawerVisible, true, 'El cajón de chat debe abrirse al hacer clic');

            const drawerPos = await page.evaluate(() => window.getComputedStyle(document.getElementById('chat-drawer')).position);
            assert.strictEqual(drawerPos, 'fixed', 'El cajón de chat debe renderizarse como overlay fixed');

            const dotClassesOpen = await page.getAttribute('#chat-status-dot', 'class');
            assert(dotClassesOpen.includes('dot-verde'), 'El punto debe volver a verde al abrir el cajón');

            // 4. Enviar una reacción rápida y luego un mensaje de texto (respetando cooldown de 900ms)
            await page.click('.quick-reaction-btn >> nth=0');
            await page.waitForTimeout(1000);

            await page.fill('#chat-text-input', '¡Tengo el Dos de la muestra!');
            await page.click('#btn-chat-send');
            await page.waitForTimeout(200);

            const bubbles = await page.$$('#chat-messages-container .chat-msg-bubble');
            assert(bubbles.length >= 3, `Deben existir al menos 3 burbujas en el historial (actual: ${bubbles.length})`);

            // Verificar que el envío de chat NUNCA bloquea la mesa con isAwaitingStateSync
            const isSyncLocked = await page.evaluate(() => Boolean(window.isAwaitingStateSync));
            assert.strictEqual(isSyncLocked, false, 'Enviar mensajes de chat no debe bloquear isAwaitingStateSync');

            await page.close();
        });

        // TEST 12: Leyendas opcionales en cartas y diálogos de confirmación auténticos (¡Quiero! / No quiero)
        await runTest('Leyendas en cartas son opcionales (desactivadas por defecto) y confirmaciones usan ¡Quiero! / No quiero', async () => {
            const page = await browser.newPage();
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Cerrar posible alerta inicial
            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$('#modal-buttons button');
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(300);
            }

            // 1. Por defecto, ninguna carta en mano debe tener la etiqueta de texto 'PIEZA'
            const labelsPorDefecto = await page.$$('.player-hand .pieza-label-pixel');
            assert.strictEqual(labelsPorDefecto.length, 0, 'Por defecto no deben mostrarse leyendas "PIEZA" sobre las cartas');

            // 2. Verificar que el diálogo de confirmación usa "¡Quiero!" y "No quiero"
            const confirmPromise = page.evaluate(() => {
                return window.UI.confirm('¿Querés Truco?');
            });
            await page.waitForSelector('#modal-custom', { state: 'visible' });

            const buttons = await page.$$('#modal-buttons button');
            assert.strictEqual(buttons.length, 2, 'El diálogo de confirmación debe tener 2 botones');

            const textYes = await buttons[0].textContent();
            const textNo = await buttons[1].textContent();

            assert(textYes.includes('¡Quiero!'), `El botón afirmativo debe decir "¡Quiero!" (actual: "${textYes}")`);
            assert(textNo.includes('No quiero'), `El botón negativo debe decir "No quiero" (actual: "${textNo}")`);

            // Confirmar clic en ¡Quiero!
            await buttons[0].click();
            const confirmResult = await confirmPromise;
            assert.strictEqual(confirmResult, true, 'Hacer clic en ¡Quiero! debe resolver afirmativamente');

            // 3. Abrir configuración y activar la casilla de ayudas visuales
            await page.evaluate(() => window.abrirConfig && window.abrirConfig());
            const configVisible = await page.isVisible('#modal-config');
            assert.strictEqual(configVisible, true, 'El modal de configuración debe abrirse');

            // Marcar checkbox de ayudas y guardar
            await page.check('#config-ayudas');
            await page.evaluate(() => window.guardarConfig && window.guardarConfig());

            // Forzar una pieza en mano y re-renderizar
            const pieceLabelCount = await page.evaluate(() => {
                window.game.players[0].hand[0] = { valor: 2, palo: 'Espada', esPieza: true };
                window.renderJuego();
                const labels = document.querySelectorAll('.player-hand .pieza-label-pixel');
                return labels.length;
            });
            assert(pieceLabelCount >= 1, 'Al activar las ayudas en configuración, debe mostrarse la leyenda PIEZA en la carta correspondiente');

            await page.close();
        });

        // TEST 13: Mini-bazas elevadas y compactas, mazo en 4P libre de solapamientos, y pestaña de Historial de la Mano Actual en el Chat
        await runTest('Mini-bazas compactas arriba, mazo 4P sin solapar rivales, e Historial de Mano en Chat funcional', async () => {
            const page = await browser.newPage({
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true
            });
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // 1. Verificar dimensiones y elevación de mini-bazas
            const bazasMetrics = await page.evaluate(() => {
                const el = document.getElementById('mini-bazas');
                const slot = document.querySelector('.baza-slot');
                const rect = el.getBoundingClientRect();
                const slotRect = slot.getBoundingClientRect();
                return {
                    top: rect.top,
                    slotWidth: slotRect.width,
                    slotHeight: slotRect.height
                };
            });
            assert(bazasMetrics.top <= 12, `Mini-bazas debe quedar en la parte superior (top <= 12px, actual: ${bazasMetrics.top}px)`);
            assert(bazasMetrics.slotWidth <= 14 && bazasMetrics.slotWidth >= 9, `Los círculos de mini-bazas deben ser compactos como el punto de chat (9-14px, actual: ${bazasMetrics.slotWidth}px)`);

            // 2. Probar el cajón de chat: abrir desde el botón superior en móvil, cambiar a pestaña "Mano Actual" y verificar eventos
            await page.click('#btn-chat-toggle');
            await page.waitForTimeout(300);

            const tabHistory = page.locator('#tab-btn-history');
            assert.strictEqual(await tabHistory.isVisible(), true, 'La pestaña "Mano Actual" debe ser visible en el chat');

            await tabHistory.click();
            await page.waitForTimeout(200);

            const historyContainerVisible = await page.isVisible('#chat-history-container');
            assert.strictEqual(historyContainerVisible, true, 'El contenedor de historial de mano debe mostrarse al seleccionar la pestaña');

            // Verificar que al menos la muestra o eventos de la mano están registrados
            const historyCount = await page.evaluate(() => {
                return (window.ChatManager && typeof window.ChatManager.getHistorialMano === 'function') 
                    ? window.ChatManager.getHistorialMano().length 
                    : 0;
            });
            assert(historyCount >= 1, `El historial de la mano actual debe registrar al menos el inicio de la mano (actual: ${historyCount})`);

            // Jugar una carta y verificar que se suma al historial de la mano en vivo
            await page.evaluate(() => {
                window.logJugada('🃏 Jugaste As de Espadas', 'propio');
            });
            await page.waitForTimeout(200);

            const newHistoryCount = await page.evaluate(() => {
                return window.ChatManager.getHistorialMano().length;
            });
            assert(newHistoryCount > historyCount, 'Al jugar una carta o registrar jugada debe sumarse al historial de la mano');

            // Volver a pestaña mensajes
            await page.click('#tab-btn-chat');
            await page.waitForTimeout(200);
            const messagesVisible = await page.isVisible('#chat-messages-container');
            assert.strictEqual(messagesVisible, true, 'Al hacer clic en Mensajes debe volver a verse el chat normal');

            await page.close();

            // 3. Probar modo 4 Jugadores (2 vs 2): Mazo no solapa rival izquierdo ni rival derecho
            const page4P = await browser.newPage({
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true
            });
            await page4P.route('**/*.firebaseio.com/**', route => route.abort());
            await page4P.goto(filePath);
            await page4P.click('text=2 vs 2');
            await page4P.waitForTimeout(2500);

            const is4PNoOverlap = await page4P.evaluate(() => {
                const deck = document.querySelector('.deck-area').getBoundingClientRect();
                const rivalL = document.querySelector('.rival-left-hand').getBoundingClientRect();
                const rivalR = document.querySelector('.rival-right-hand').getBoundingClientRect();

                const overlap = (r1, r2) => !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);

                return {
                    hasDeck4pClass: document.querySelector('.deck-area').classList.contains('deck-4p'),
                    overlapLeft: overlap(deck, rivalL),
                    overlapRight: overlap(deck, rivalR)
                };
            });

            assert.strictEqual(is4PNoOverlap.hasDeck4pClass, true, 'El área del mazo debe tener la clase deck-4p');
            assert.strictEqual(is4PNoOverlap.overlapLeft, false, 'El mazo en 4P no debe solapar las cartas del rival izquierdo');
            assert.strictEqual(is4PNoOverlap.overlapRight, false, 'El mazo en 4P no debe solapar las cartas del rival derecho');

            await page4P.close();
        });

        // TEST 14: Toques de Envido (Envido, Real Envido y Falta Envido)
        await runTest('Toques de Envido: Clic en ¡ENVIDO! despliega opciones de Envido, Real Envido y Falta Envido con flujo interactivo', async () => {
            const page = await browser.newPage({
                viewport: { width: 1280, height: 800 }
            });
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);
            await page.click('text=1 vs 1');
            await page.waitForTimeout(2000);

            // Cerrar cualquier modal automático si apareció
            const isModal = await page.isVisible('#modal-custom');
            if (isModal) {
                const btnOk = await page.$("#modal-buttons button");
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(300);
            }

            // Asegurar que estamos en fase inicial para cantar envido (mano 3 cartas, sin flor)
            await page.evaluate(() => {
                window.game.envidoCantado = false;
                window.game.fase = 'cantos';
                window.game.turno = 'jugador';
                // Forzar mano común de 3 cartas sin flor
                window.game.players[0].hand = [
                    { valor: 7, palo: 'Espada', esPieza: false, poder: 12 },
                    { valor: 6, palo: 'Espada', esPieza: false, poder: 3 },
                    { valor: 4, palo: 'Basto', esPieza: false, poder: 1 }
                ];
                window.game.players[1].hand = [
                    { valor: 7, palo: 'Copa', esPieza: false, poder: 4 },
                    { valor: 5, palo: 'Copa', esPieza: false, poder: 2 },
                    { valor: 4, palo: 'Oro', esPieza: false, poder: 1 }
                ];
                window.game.manoJugador = window.game.players[0].hand;
                window.game.manoOponente = window.game.players[1].hand;
                window.renderJuego();
            });
            await page.waitForTimeout(200);

            const btnEnvido = page.locator('#btn-envido');
            assert.strictEqual(await btnEnvido.isVisible(), true, 'El botón de Envido debe ser visible');

            // Clic en el botón de Envido
            await btnEnvido.click();
            await page.waitForTimeout(300);

            // Verificar que el modal de opciones de toques está visible
            const modalVisible = await page.isVisible('#modal-custom');
            assert.strictEqual(modalVisible, true, 'El modal de toques debe abrirse al presionar ¡ENVIDO!');

            const modalButtons = await page.$$("#modal-buttons button");
            assert(modalButtons.length >= 3, 'Debe haber al menos 3 opciones (Envido, Real Envido, Falta Envido, Cancelar)');

            const btnTexts = await Promise.all(modalButtons.map(b => b.textContent()));
            const hasEnvido = btnTexts.some(t => t.includes('Envido (2 pts)'));
            const hasRealEnvido = btnTexts.some(t => t.includes('Real Envido (3 pts)'));
            const hasFaltaEnvido = btnTexts.some(t => t.includes('Falta Envido'));

            assert(hasEnvido, 'Debe incluir opción de Envido (2 pts)');
            assert(hasRealEnvido, 'Debe incluir opción de Real Envido (3 pts)');
            assert(hasFaltaEnvido, 'Debe incluir opción de Falta Envido');

            // Seleccionar Real Envido (3 pts)
            const btnReal = modalButtons.find(b => btnTexts[modalButtons.indexOf(b)].includes('Real Envido'));
            assert(btnReal, 'El botón de Real Envido debe existir');
            await btnReal.click();
            await page.waitForTimeout(800);

            // Si aparece diálogo de respuesta de la IA (Alerta o confirmación), cerrarlo
            const modalResp = await page.isVisible('#modal-custom');
            if (modalResp) {
                const btnOk = await page.$("#modal-buttons button");
                if (btnOk) await btnOk.click();
                await page.waitForTimeout(400);
            }

            // Verificar que el estado del juego registró envidoCantado = true
            const envidoCantado = await page.evaluate(() => window.game.envidoCantado);
            assert.strictEqual(envidoCantado, true, 'El envido debe quedar marcado como cantado');

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

