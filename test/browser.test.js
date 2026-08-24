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

        // TEST 4: Vista Móvil Vertical (Viewport 375x812)
        await runTest('Prueba en resolución Mobile vertical (iPhone/Android)', async () => {
            const page = await browser.newPage({
                viewport: { width: 375, height: 812 },
                isMobile: true,
                hasTouch: true
            });
            // Interceptar peticiones de red externas para aislamiento 100% offline
            await page.route('**/*.firebaseio.com/**', route => route.abort());
            await page.goto(filePath);

            // Clic en 1 vs 1 en móvil
            await page.click('text=1 vs 1');
            await page.waitForFunction(() => {
                const el = document.getElementById('pantalla-inicio');
                return el && (el.style.display === 'none' || window.getComputedStyle(el).display === 'none');
            }, { timeout: 5000 });
            await page.waitForTimeout(2000);

            // Verificar que el panel de acciones esté visible y anclado abajo
            const isActionsVisible = await page.isVisible('#actions-panel');
            assert.strictEqual(isActionsVisible, true, 'El panel de voces debe estar visible');

            const actionsPanel = await page.waitForSelector('#actions-panel');
            const boundingBox = await actionsPanel.boundingBox();
            assert(boundingBox && (boundingBox.y + boundingBox.height >= 700), 'El panel de voces debe estar anclado en la parte inferior en móvil');

            // Verificar tamaño de cartas en mano móvil
            const firstCard = await page.waitForSelector('.player-hand .card');
            const cardBox = await firstCard.boundingBox();
            assert(cardBox.width >= 80, 'Las cartas en móvil deben tener un ancho adecuado (>= 80px)');
            await page.close();
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
