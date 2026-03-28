const PALS_SVG = {
    'Oro': `<svg viewBox="0 0 100 100" class="suit-svg"><circle cx="50" cy="50" r="38" fill="#f1c40f" stroke="#d35400" stroke-width="4"/><circle cx="50" cy="50" r="22" fill="none" stroke="#d35400" stroke-width="3" stroke-dasharray="6,4"/><circle cx="50" cy="50" r="10" fill="#e67e22"/></svg>`,
    'Copa': `<svg viewBox="0 0 100 100" class="suit-svg"><path d="M20,20 Q50,95 80,20 Z" fill="#e74c3c" stroke="#c0392b" stroke-width="3"/><rect x="42" y="65" width="16" height="28" fill="#c0392b" rx="2"/><path d="M25,92 Q50,82 75,92" fill="none" stroke="#c0392b" stroke-width="8" stroke-linecap="round"/></svg>`,
    'Espada': `<svg viewBox="0 0 100 100" class="suit-svg"><path d="M50,2 L64,68 L36,68 Z" fill="#3498db" stroke="#2980b9" stroke-width="2"/><rect x="22" y="68" width="56" height="8" rx="4" fill="#2c3e50"/><rect x="42" y="76" width="16" height="20" rx="3" fill="#2980b9"/><circle cx="50" cy="94" r="5" fill="#2c3e50"/></svg>`,
    'Basto': `<svg viewBox="0 0 100 100" class="suit-svg"><rect x="35" y="8" width="30" height="84" rx="15" fill="#2ecc71" stroke="#27ae60" stroke-width="4"/><path d="M35,25 L65,25 M35,50 L65,50 M35,75 L65,75" stroke="#208b49" stroke-width="5"/></svg>`
};

const game = new GameStateManager();
window.modoJuego = 'singleplayer';

let lastJugadorPts = 0;
let lastOponentePts = 0;

let turnTimerInterval = null;
let autoRepartirInterval = null;
const TURN_TIME = 25; // 25 Segundos para jugar
window.isAwaitingStateSync = false; 

window.resetTimer = function() {
    clearInterval(turnTimerInterval);
    const container = document.getElementById('turn-timer-container');
    const bar = document.getElementById('turn-timer-bar');
    if(container) container.style.display = 'none';
    if(bar) bar.style.width = '100%';
};

window.startTurnTimer = function(syncStartTime) {
    window.resetTimer();
    if (window.modoJuego !== 'multiplayer') return;
    
    // Solo si el juego está en curso y es turno del jugador
    if (game.turno === 'jugador' && !game.rondaTerminada && game.partidoIniciado) {
        const now = Date.now();
        const startTime = syncStartTime || now;
        
        // Calcular tiempo restante basado en cuándo empezó el turno realmente
        let elapsed = Math.floor((now - startTime) / 1000);
        let timeLeft = TURN_TIME - elapsed;
        
        if (timeLeft <= 0) timeLeft = 0;

        const container = document.getElementById('turn-timer-container');
        const bar = document.getElementById('turn-timer-bar');
        
        if (container) container.style.display = 'block';
        if (bar) {
            const percentage = (timeLeft / TURN_TIME) * 100;
            bar.style.transition = 'none';
            bar.style.width = `${percentage}%`;
            
            if (timeLeft > 0) {
                setTimeout(() => {
                    bar.style.transition = `width ${timeLeft}s linear`;
                    bar.style.width = '0%';
                }, 50);
            }
        }
        
        turnTimerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                window.resetTimer();
                // Si llegamos a 0 y no hay un modal abierto (lo que frenaría la interacción)
                if (document.getElementById('modal-custom').style.display !== 'block') {
                    if (game.manoJugador.length > 0) {
                        const rand = Math.floor(Math.random() * game.manoJugador.length);
                        logJugada("⏳ Tiempo agotado. Se jugó una carta al azar.", "sistema");
                        jugarUI(rand).catch(e => console.log(e));
                    }
                }
            }
        }, 1000);
    }
};

window.mostrarMarcadorTemporal = function() {
    const marcador = document.getElementById('mini-marcador');
    if (!marcador) return;
    if (marcador.dataset.manual === 'true') return;

    marcador.classList.add('show-score');
    
    if (window.marcadorTimeout) clearTimeout(window.marcadorTimeout);
    
    window.marcadorTimeout = setTimeout(() => {
        if (marcador.dataset.manual !== 'true') {
            marcador.classList.remove('show-score');
        }
    }, 4500); // Muestra por 4.5 segundos antes de ocultarse
};

window.toggleMarcadorGlobal = function() {
    const marcador = document.getElementById('mini-marcador');
    const ayudante = document.getElementById('ayudante-puntos');
    if (!marcador) return;
    
    if (marcador.dataset.manual === 'true') {
        marcador.dataset.manual = 'false';
        marcador.classList.remove('show-score');
        if (ayudante) ayudante.style.display = 'none';
    } else {
        marcador.dataset.manual = 'true';
        marcador.classList.add('show-score');
        if (ayudante) ayudante.style.display = 'flex';
    }
};

function logJugada(texto, tipo = 'sistema') {
    const feed = document.getElementById('game-feed');
    if (!feed) return;
    const msg = document.createElement('div');
    msg.className = `feed-msg ${tipo}`;
    msg.innerText = texto;
    feed.prepend(msg);
    
    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translateX(-20px)';
        setTimeout(() => msg.remove(), 500);
    }, 8000);
}

function iniciarSolo() {
    document.getElementById('pantalla-inicio').style.display = 'none';
    window.modoJuego = 'singleplayer';
    game.iniciarRonda();
    logJugada("🧉 ¡Suerte en el paño, gurí!", "sistema");
    window.animarReparto();
}

function crearCartaDOM(carta, oculta = false, isMuestra = false) {
    const div = document.createElement('div');
    div.classList.add('card');
    
    if (oculta) {
        div.classList.add('card-facedown');
    } else {
        const svg = PALS_SVG[carta.palo];
        const paloClass = `palo-${carta.palo.toLowerCase()}`;
        const pintaClass = `pinta-${carta.palo.toLowerCase()}`;
        
        let labelText = '';
        if (carta.valor === 10) labelText = "SOTA";
        if (carta.valor === 11) labelText = "CABALLO";
        if (carta.valor === 12) labelText = "REY";
        
        div.innerHTML = `
            <div class="card-inner-frame ${pintaClass}">
                ${carta.palo === 'Basto' ? '<div class="pinta-basto-mid"></div>' : ''}
            </div>
            <div class="card-content ${paloClass}">
                <div class="card-value-top">
                    <span>${carta.valor}</span>
                </div>
                <div class="card-suit-main">
                    ${labelText ? `<span class="figura-text">${labelText}</span>` : ''}
                    ${svg}
                </div>
                <div class="card-value-bot">
                    <span>${carta.valor}</span>
                </div>
                ${carta.esPieza ? '<div class="pieza-label">PIEZA</div>' : ''}
            </div>
        `;
        if (carta.esPieza) div.classList.add('pieza-glowing');
    }

    if(isMuestra) div.classList.add('card-muestra');

    return div;
}

window.isAnimatingDeal = false;

window.animarReparto = async function() {
    if (window.isAnimatingDeal) return;
    window.isAnimatingDeal = true;
    
    const oppHandEl = document.getElementById('opponent-hand');
    const plyHandEl = document.getElementById('player-hand');
    const deckArea = document.querySelector('.deck-area');
    
    // Limpieza inicial para la animación
    if (oppHandEl) oppHandEl.innerHTML = '';
    if (plyHandEl) plyHandEl.innerHTML = '';
    if (deckArea) {
        deckArea.innerHTML = '';
        deckArea.className = 'deck-area';
        deckArea.classList.add(game.manoDelPartido === 'oponente' ? 'deck-mi-derecha' : 'deck-su-derecha');
        
        // El mazo visual
        const mazoDescifrado = crearCartaDOM(null, true);
        mazoDescifrado.classList.remove('card-facedown');
        mazoDescifrado.classList.add('card-deck');
        deckArea.appendChild(mazoDescifrado);
    }

    const mano = game.manoDelPartido; // 'jugador' o 'oponente'
    const totalCartas = 6;
    
    for (let i = 0; i < 3; i++) {
        // Carta al Mano
        window.audio.play('card-deal');
        if (mano === 'jugador') {
            const c = game.manoJugador[i];
            const cardDOM = crearCartaDOM(c, false);
            cardDOM.classList.add('animate-deal');
            cardDOM.addEventListener('click', () => jugarUI(i));
            plyHandEl.appendChild(cardDOM);
        } else {
            const c = game.manoOponente[i];
            const cardDOM = crearCartaDOM(c, true);
            cardDOM.classList.add('animate-deal');
            oppHandEl.appendChild(cardDOM);
        }
        await new Promise(r => setTimeout(r, 400));

        // Carta al Pie
        window.audio.play('card-deal');
        if (mano === 'jugador') {
            const c = game.manoOponente[i];
            const cardDOM = crearCartaDOM(c, true);
            cardDOM.classList.add('animate-deal');
            oppHandEl.appendChild(cardDOM);
        } else {
            const c = game.manoJugador[i];
            const cardDOM = crearCartaDOM(c, false);
            cardDOM.classList.add('animate-deal');
            cardDOM.addEventListener('click', () => jugarUI(i));
            plyHandEl.appendChild(cardDOM);
        }
        await new Promise(r => setTimeout(r, 400));
    }

    // Muestra (Al final, debajo del mazo)
    if (game.muestra && deckArea) {
        window.audio.play('card-play');
        const muestraDOM = crearCartaDOM(game.muestra, false, true);
        muestraDOM.classList.add('appearing');
        deckArea.insertBefore(muestraDOM, deckArea.firstChild);
    }

    window.isAnimatingDeal = false;
    renderJuego(); // Render final para asegurar estado correcto y listeners
};

window.shakeCards = function() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(c => {
        c.classList.remove('shake');
        void c.offsetWidth; // Trigger reflow
        c.classList.add('shake');
        setTimeout(() => c.classList.remove('shake'), 800);
    });
};

function renderJuego() {
    if (window.isAnimatingDeal) return;
    const oppHandEl = document.getElementById('opponent-hand');
    oppHandEl.innerHTML = '';
    game.manoOponente.forEach(c => {
        oppHandEl.appendChild(crearCartaDOM(c, true));
    });

    const plyHandEl = document.getElementById('player-hand');
    if(plyHandEl) plyHandEl.innerHTML = '';
    game.manoJugador.forEach((c, index) => {
        const cardDOM = crearCartaDOM(c, false);
        cardDOM.addEventListener('click', () => jugarUI(index));
        if(plyHandEl) plyHandEl.appendChild(cardDOM);
    });

    const deckArea = document.querySelector('.deck-area');
    if(deckArea) {
        deckArea.innerHTML = '';
        deckArea.className = 'deck-area';
        
        // El mazo va a la derecha del que reparte (el Pie)
        // Si 'Mano' es oponente, yo soy 'Pie' -> Va a MI derecha
        if (game.manoDelPartido === 'oponente') {
            deckArea.classList.add('deck-mi-derecha');
        } else {
            // Si 'Mano' soy yo, el rival es 'Pie' -> Va a SU derecha
            deckArea.classList.add('deck-su-derecha');
        }

        if(game.muestra) {
            const muestraDOM = crearCartaDOM(game.muestra, false, true);
            deckArea.appendChild(muestraDOM);
        }
        
        const mazoDescifrado = crearCartaDOM(null, true);
        mazoDescifrado.classList.remove('card-facedown');
        mazoDescifrado.classList.add('card-deck');
        deckArea.appendChild(mazoDescifrado);
    }

    const mesaOpp = document.getElementById('mesa-oponente');
    const mesaPly = document.getElementById('mesa-jugador');
    if(mesaOpp) mesaOpp.innerHTML = '';
    if(mesaPly) mesaPly.innerHTML = '';
    
    if (game.mesa.oponente && mesaOpp) mesaOpp.appendChild(crearCartaDOM(game.mesa.oponente));
    if (game.mesa.jugador && mesaPly) mesaPly.appendChild(crearCartaDOM(game.mesa.jugador));

    const calc = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador);
    const envPts = document.getElementById('envido-pts');
    const florPts = document.getElementById('flor-pts');
    if(envPts) envPts.innerText = `${calc.puntos} pts (${calc.tipo})`;
    if(florPts) florPts.innerText = calc.tieneFlor ? `Sí (Obligatorio)` : `No`;

    // Visual: Malas o Buenas en el Marcador
    const ptsJ = game.puntosPartido.jugador;
    const ptsO = game.puntosPartido.oponente;
    const mitad = game.config.limitePuntos / 2;
    
    const labelJ = document.getElementById('label-malas-buenas-jugador');
    const labelO = document.getElementById('label-malas-buenas-oponente');
    if (labelJ) labelJ.innerText = ptsJ < mitad ? 'MALAS' : 'BUENAS';
    if (labelO) labelO.innerText = ptsO < mitad ? 'MALAS' : 'BUENAS';

    const btnFlor = document.getElementById('btn-flor');
    const btnEnvido = document.getElementById('btn-envido');
    
    if (btnFlor && btnEnvido) {
        if (game.manoJugador.length === 3 && !game.envidoCantado) {
            if (calc.tieneFlor) {
                btnFlor.style.display = 'block';
                btnEnvido.style.display = 'none'; 
            } else {
                btnFlor.style.display = 'none';
                btnEnvido.style.display = 'block';
            }
        } else {
            btnFlor.style.display = 'none';
            btnEnvido.style.display = 'none';
        }
    }

    const btnTruco = document.getElementById('btn-truco');
    if (btnTruco) {
        if (game.apuestaTruco.turnoCantar === 'oponente' || game.apuestaTruco.estado === 'vale4') {
            btnTruco.style.opacity = '0.4';
            btnTruco.style.filter = 'grayscale(100%)';
            btnTruco.style.pointerEvents = 'none'; // Deshabilita clicks temporalmente
        } else {
            btnTruco.style.opacity = '1';
            btnTruco.style.filter = 'none';
            btnTruco.style.pointerEvents = 'auto';
        }
        
        // Reflejar texto según el nivel actual
        if (game.apuestaTruco.estado === 'nada') btnTruco.innerText = '¡TRUCO!';
        if (game.apuestaTruco.estado === 'truco') btnTruco.innerText = '¡RETRUCO!';
        if (game.apuestaTruco.estado === 'retruco') btnTruco.innerText = '¡VALE 4!';
    }

    const scoreJugador = document.getElementById('mini-score-yo');
    const scoreOponente = document.getElementById('mini-score-rival');
    if(scoreJugador) scoreJugador.innerText = game.puntosPartido.jugador;
    if(scoreOponente) scoreOponente.innerText = game.puntosPartido.oponente;
    
    const lim = game.config.limitePuntos;
    if ((game.puntosPartido.jugador >= lim || game.puntosPartido.oponente >= lim) && !game.partidoFinalizado) {
        if (typeof verificarLimitesPartido === 'function') {
            setTimeout(verificarLimitesPartido, 300);
        }
    }

    // Auto-mostrar marcador si hay variación de puntos
    if (game.puntosPartido.jugador !== lastJugadorPts || game.puntosPartido.oponente !== lastOponentePts) {
        lastJugadorPts = game.puntosPartido.jugador;
        lastOponentePts = game.puntosPartido.oponente;
        if (window.mostrarMarcadorTemporal && game.partidoIniciado) {
            window.mostrarMarcadorTemporal();
        }
    }
    
    const nameJugador = document.getElementById('mini-name-yo');
    const nameOponente = document.getElementById('mini-name-rival');
    if(nameJugador) nameJugador.innerText = game.config.nombreJugador;
    if(nameOponente) nameOponente.innerText = game.config.nombreOponente;

    const btnTogglePuntos = document.getElementById('toggle-puntos-btn');
    if (btnTogglePuntos) {
        btnTogglePuntos.style.opacity = game.partidoIniciado ? '1' : '0';
        btnTogglePuntos.style.pointerEvents = game.partidoIniciado ? 'auto' : 'none';
    }

    for(let i=1; i<=3; i++) {
        const slot = document.getElementById('baza-'+i);
        if(slot) {
            slot.className = 'baza-slot';
            if (game.registroBazas[i-1]) {
                const b = game.registroBazas[i-1];
                if (b === 'jugador') slot.classList.add('baza-p');
                else if (b === 'oponente') slot.classList.add('baza-o');
                else if (b === 'empate') slot.classList.add('baza-e');
            }
        }
    }
}

window.isAwaitingStateSync = false;
window.syncTimeout = null;
window.startSyncTimeout = function(ms = 10000) {
    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
        if (window.isAwaitingStateSync) {
            console.warn("⏳ Sincronización lenta: Desbloqueo de emergencia activado.");
            window.isAwaitingStateSync = false;
            renderJuego();
        }
    }, ms);
};

async function jugarUI(indexCarta) {
    if (game.turno !== 'jugador' || game.rondaTerminada || window.isAwaitingStateSync) return;
    
    window.lastPlayerPlayTime = Date.now(); // ESTRATEGIA 18: IA mide la rapidez
    const c = game.manoJugador[indexCarta];
    const nombre= c.getNombreCriollo(game.paloMuestra, game.piezasActivas);
    
    const cartaAprobada = game.jugarCarta('jugador', indexCarta);
    if (!cartaAprobada) {
        logJugada("⚠️ No podés jugar esa carta ahora.", "sistema");
        return;
    }

    logJugada(`🃏 Jugaste ${nombre}`, 'propio');
    window.audio.play('card-play');
    
    if (window.modoJuego === 'multiplayer') {
        window.isAwaitingStateSync = true;
        window.startSyncTimeout();
        enviarAccionFirebase('jugar_carta', { index: indexCarta });
        sincronizarEstadoMotor({ timerStartTime: Date.now() });
    }
    
    renderJuego();

    if (!game.mesa.oponente) {
        if (window.modoJuego === 'singleplayer') {
            setTimeout(async () => { await jugarBot(); }, 600);
        }
    } else {
        await verificarResolucionMesa();
        if (window.modoJuego === 'multiplayer') sincronizarEstadoMotor({ timerStartTime: Date.now() });
    }
}

async function verificarLimitesPartido() {
    if (game.partidoFinalizado) return true;
    
    const lim = game.config.limitePuntos;
    const jLlega = game.puntosPartido.jugador >= lim;
    const oLlega = game.puntosPartido.oponente >= lim;

    if (jLlega || oLlega) {
        let ganadorPartido = null;
        if (jLlega && !oLlega) ganadorPartido = 'jugador';
        else if (oLlega && !jLlega) ganadorPartido = 'oponente';
        else {
            // Choque mortal: Ambos cobraron puntos simultáneos superando el límite. Gana el Mano.
            ganadorPartido = game.manoDelPartido;
        }
        
        game.partidoFinalizado = true;
        const txt = ganadorPartido === 'jugador' ? 
            `🎉 ¡PARTIDO LIQUIDADO!<br>Ganaste ${game.puntosPartido.jugador} a ${game.puntosPartido.oponente} 🧉` : 
            `💀 ¡LA MÁQUINA (O EL RIVAL) TE PASÓ POR ARRIBA!<br>Marchaste ${game.puntosPartido.oponente} a ${game.puntosPartido.jugador} 🤖`;
        
        await window.UI.alert(txt, "🏆 FIN DEL PARTIDO 🏆");
        window.resetTimer();
        
        if (window.modoJuego === 'multiplayer') {
            window.finalizarSalaFirebase();
            const revancha = await window.UI.confirm("¿Querés pedirle una revancha al rival?", "Revancha");
            if (revancha) {
                window.esperandoRespuestaRevancha = true; // Flag anti-duplicados por lag
                enviarAccionFirebase('pedir_revancha');
                await window.UI.alert("Esperando respuesta del rival...");
            } else {
                enviarAccionFirebase('respuesta_revancha', { aceptada: false });
                setTimeout(() => location.reload(), 500);
            }
        } else {
            const revancha = await window.UI.confirm("¿Querés jugar otro partido de revancha contra la IA?");
            if (revancha) {
                game.puntosPartido.jugador = 0;
                game.puntosPartido.oponente = 0;
                game.partidoIniciado = false; 
                document.getElementById('btn-repartir').style.display = 'none';
                document.getElementById('btn-truco').innerText = "Gritar Truco";
                game.iniciarRonda();
                logJugada("🔄 Comenzando nuevo partido...", "sistema");
                renderJuego();
            } else {
                location.reload();
            }
        }
        return true;
    }
    return false;
}

async function jugarBot() {
    if (window.modoJuego === 'multiplayer') return;
    if (game.rondaTerminada || game.manoOponente.length === 0) return;
    
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.innerText = "Rival está pensando...";
        indicator.style.display = 'block';
    }
    
    // -- ESTRATEGIA 18: LECTURA DE TIEMPO (SOSPECHA POR RAPIDEZ) --
    let sospechaRapidez = 0;
    if (window.lastPlayerPlayTime && (Date.now() - window.lastPlayerPlayTime < 1500)) {
        sospechaRapidez = 10; // Si el humano tira instantáneo, el bot sospecha
    }

    // -- EVALUACIÓN DE MANO Y FACTORES PSICOLÓGICOS --
    const objIA = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente);
    const objJG = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador);
    const poderMano = game.evaluarPoderMano(game.manoOponente);
    const probBluff = Math.random() < 0.15; // 15% de probabilidad de ser un "mentiroso" en esta mano
    const esDormido = Math.random() < 0.10; // 10% de probabilidad de no cantar nada aunque tenga piezas (trampa pasiva)

    const soyMano = (game.manoDelPartido === 'oponente');
    const bazasGanadas = game.manosGanadas.oponente;
    const bazasPerdidas = game.manosGanadas.jugador;
    
    // -- ESTRATEGIA 8: CONSERVADURISMO (MARCADOR CRÍTICO) --
    const esFinalPartido = (game.puntosPartido.oponente >= (game.config.limitePuntos - 3));
    const probBluffFinal = esFinalPartido ? 0 : (probBluff ? 0.15 : 0);

    // -- ESTRATEGIA 7: PROFILING (BLUFF CATCHER) --
    const rivalEsMentiroso = game.perfilRival.bluffsDetectados > 1;

    // -- 1. LÓGICA DE CANTOS (FLOR / ENVIDO) --
    if (game.manoOponente.length === 3 && !game.envidoCantado) {
        // ESTRATEGIA 11: FLOR ESCONDIDA (Pie espera al Envido)
        let cantarFlorAhora = true;
        if (!soyMano && objIA.tieneFlor && Math.random() < 0.3) cantarFlorAhora = false; // 30% decide esperar

        if (objIA.tieneFlor && cantarFlorAhora) {
            game.envidoCantado = true;
            if (objJG.tieneFlor) {
                // Choque de flores
                const contra = await window.UI.confirm("🤖 IA: ¡Tengo FLOR, papá!<br><br>Tú también tienes Flor.<br>¿Te le animás a gritarle CONTRA FLOR AL RESTO?");
                if (contra) {
                    window.shakeCards();
                    await window.UI.alert(`🗣️ Tú: ¡CONTRA FLOR AL RESTO!<br>🤖 Rival: ¡QUIERO VALE!`);
                    let lider = Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
                    let premio = game.config.limitePuntos - lider; 
                    if (objJG.puntos > objIA.puntos || (objJG.puntos === objIA.puntos && game.manoDelPartido === 'jugador')) {
                        game.recordarPuntosRival(objJG.puntos, true);
                        await window.UI.alert(`¡Tu Flor le ganó! (+${premio} pts)`);
                        game.puntosPartido.jugador += premio;
                    } else {
                        await window.UI.alert(`¡La Flor de la IA te mató! (+${premio} pts)`);
                        game.puntosPartido.oponente += premio;
                    }
                } else {
                    game.puntosPartido.oponente += 3; game.puntosPartido.jugador += 3;
                }
            } else {
                logJugada("🤖 IA: ¡FLOR!", 'rival');
                game.puntosPartido.oponente += 3;
            }
            if(await verificarLimitesPartido()) return;
        } 
        else if (objIA.puntos >= 29 || (probBluff && objIA.puntos >= 20)) {
            // El bot decide tocar envido
            game.envidoCantado = true;
            const msg = probBluff ? "¡TOCO ENVIDO! (Te está mintiendo...)" : "¡TOCO ENVIDO!";
            const quiereEnv = await window.UI.confirm(`🤖 IA: ${msg}<br><br>Tus puntos: ${objJG.puntos} pts<br>¿Aceptás?`, "Desafío de IA");
            
            if (quiereEnv) {
                game.recordarPuntosRival(objJG.puntos, false);
                game.analizarBluff(objJG.puntos, true);
                window.shakeCards();
                await window.UI.alert(`🤖 IA muestra: ${objIA.puntos} pts.`);
                if (objJG.puntos > objIA.puntos || (objJG.puntos === objIA.puntos && game.manoDelPartido === 'jugador')) {
                    await window.UI.alert(`¡Ganaste el envido! (+2 pts)`);
                    game.puntosPartido.jugador += 2;
                } else {
                    await window.UI.alert(`¡IA gana el envido! (+2 pts)`);
                    game.puntosPartido.oponente += 2;
                }
            } else {
                game.puntosPartido.oponente += 1;
            }
            if(await verificarLimitesPartido()) return;
        }
    }

    // -- 2. LÓGICA DE TRUCO --
    if (game.apuestaTruco.estado === 'nada' && !esDormido) {
        // Canta truco si tiene poder > 50 o si está blufeando
        if (poderMano > 50 || probBluff) {
            const msg = probBluff ? "¡TRUCO! (¡Miralo al mentiroso!)" : "¡TRUCO!";
            const quiereT = await window.UI.confirm(`🤖 IA: ${msg}<br>¿Querés?`, "¡Truco de la IA!");
            if (quiereT) {
                window.shakeCards();
                game.apuestaTruco.valor = 2;
                game.apuestaTruco.estado = 'truco';
                game.apuestaTruco.turnoCantar = 'jugador';
            } else {
                game.puntosPartido.oponente += 1;
                game.rondaTerminada = true;
                if(await verificarLimitesPartido()) return;
                renderJuego();
                document.getElementById('btn-repartir').style.display = 'block';
                return;
            }
        }
    }

    // -- 2.1 LÓGICA DE IRSE AL MAZO (RETIRADA TÁCTICA) --
    // Si la IA perdió la primera baza y sus cartas son basura, se retira para no arriesgar más puntos
    if (game.manosGanadas.jugador === 1 && game.manosGanadas.oponente === 0 && poderMano < 15 && game.apuestaTruco.valor === 1) {
        await window.UI.alert(`🤖 IA: ¡Me voy al mazo! Las tuyas pintan mejor.<br>(Ganas 1 punto)`);
        game.puntosPartido.jugador += 1;
        game.rondaTerminada = true;
        if(await verificarLimitesPartido()) return;
        renderJuego();
        document.getElementById('btn-repartir').style.display = 'block';
        return;
    }

    // -- 3. SELECCIÓN DE CARTA ESTRATÉGICA (20 CAPAS) --
    let cartaElegida = null;
    let indexElegido = 0;

    const tienePieza = game.manoOponente.some(c => c.esPieza);

    if (game.mesa.jugador) {
        // ESTRATEGIA 14: DEDUCCIÓN DE PALO
        game.registrarAccionRival('carta', game.mesa.jugador);
        
        let rivalTienePiezaDeducida = game.memoriaRival.piezaProbable !== null;
        if (game.mesa.jugador.esPieza) rivalTienePiezaDeducida = false;

        // ESTRATEGIA 15: AHORRO DE PIEZA (No usarla si una mata común alcanza)
        const mejorMataComun = game.manoOponente.filter(c => !c.esPieza && c.poder > game.mesa.jugador.poder).sort((a,b) => a.poder - b.poder)[0];
        if (mejorMataComun && !rivalTienePiezaDeducida) {
            cartaElegida = mejorMataComun;
        } else {
            cartaElegida = game.obtenerMejorRespuesta(game.manoOponente, game.mesa.jugador.poder);
        }
    } else {
        // ESTRATEGIA 9: PARDA MASTER
        const fueParda = game.registroBazas[0] === 'empate';
        
        if (game.manoOponente.length === 3) {
            // ESTRATEGIA 12: EL AMAGUE (Fingir debilidad en 1ra)
            const sorted = [...game.manoOponente].sort((a, b) => a.poder - b.poder);
            if (Math.random() < 0.2 && !esFinalPartido) {
                cartaElegida = sorted[0]; // Tira la más baja adrede
            } else {
                // ESTRATEGIA 10: LEAD TACTICIAN (No regalar mesa)
                cartaElegida = soyMano ? (sorted[1] || sorted[0]) : sorted[0];
            }
        } else if (game.manoOponente.length === 2 && bazasGanadas === 1) {
            // ESTRATEGIA 6: LA CURA (Baitear en 2da si ganó 1ra y tiene pieza)
            if (tienePieza && !fueParda) {
                const soloBajas = game.manoOponente.filter(c => !c.esPieza).sort((a,b) => a.poder - b.poder);
                cartaElegida = soloBajas[0] || game.manoOponente[0];
            } else {
                const sorted = [...game.manoOponente].sort((a, b) => b.poder - a.poder);
                cartaElegida = fueParda ? sorted[0] : (sorted[1] || sorted[0]); 
            }
        } else {
            // ESTRATEGIA 13: CERRAR LA PUERTA (Asegurar punto final)
            const sorted = [...game.manoOponente].sort((a, b) => b.poder - a.poder);
            cartaElegida = sorted[0];
        }
    }

    indexElegido = game.manoOponente.indexOf(cartaElegida);
    game.jugarCarta('oponente', indexElegido);
    renderJuego();
    
    if (game.mesa.jugador) {
        const nombre = game.mesa.oponente.getNombreCriollo(game.paloMuestra, game.piezasActivas);
        logJugada(`🤖 Rival juega ${nombre}`, 'rival');
        await verificarResolucionMesa();
    }
}

async function verificarResolucionMesa() {
    if (game.mesa.jugador && game.mesa.oponente) {
        await new Promise(r => setTimeout(r, 800));
        
        const result = game.evaluarMesa();
        renderJuego(); 
        
        if (result.ganadorRonda) {
            let ptsJuego = game.apuestaTruco.valor;
            if (result.ganadorRonda === 'jugador') {
                game.puntosPartido.jugador += ptsJuego;
                window.audio.play('win-baza');
            } else if (result.ganadorRonda === 'oponente') {
                game.puntosPartido.oponente += ptsJuego;
                window.audio.play('loss');
            }

            const txt = result.ganadorRonda === 'jugador' ? `¡Esa mano es tuya, papá! 🏆 (+${ptsJuego} Pts)` : (result.ganadorRonda === 'empate' ? `¡Parda! Quedamos feos pa' la foto.<br>Si hubo truco se esfuma.` : `Marchaste al spiedo en esta mano 💀 (+${ptsJuego} Pts pa' la IA)`);
            
            if (window.modoJuego === 'multiplayer' && typeof window.sincronizarEstadoMotor === 'function') {
                window.sincronizarEstadoMotor({ timerStartTime: Date.now() });
            }
            
            if(await verificarLimitesPartido()) return;
            
            renderJuego(); 
            logJugada(`🔔 ${txt.replace(/<br>/g, ' ')}`, 'sistema');
            
            await window.manejarFinDeRondaUI();
        } else {
            if (game.turno === 'oponente' && window.modoJuego === 'singleplayer') {
                setTimeout(async () => { await jugarBot(); }, 400);
            } else if (game.turno === 'jugador') {
                window.vibrateAction(100); // Vibrar al inicio del turno del jugador
            }
        }
    }
}

document.getElementById('btn-envido').addEventListener('click', async () => {
    if (game.manoJugador.length !== 3 || game.envidoCantado || window.isAwaitingStateSync) return;
    
    const ptsFalta = game.calcPuntosFalta();
    const opt = await window.UI.options("Elegí tu toque:", [
        { label: "Envido (2 pts)", value: "envido", primary: true },
        { label: "Real Envido (3 pts)", value: "real_envido" },
        { label: `Falta Envido (${ptsFalta} pts)`, value: "falta_envido", danger: true },
        { label: "Cancelar", value: "cancel", neutral: true }
    ], "Toques (Envido)");

    if (opt === "cancel") return;

    let ptsToque = 2;
    let labelToque = "ENVIDO";
    if (opt === "real_envido") { ptsToque = 3; labelToque = "REAL ENVIDO"; }
    if (opt === "falta_envido") { ptsToque = ptsFalta; labelToque = "FALTA ENVIDO"; }

    if (window.modoJuego === 'multiplayer') {
        window.isAwaitingStateSync = true;
        window.startSyncTimeout();
        game.envidoCantado = true;
        window.audio.play('envido');
        enviarAccionFirebase('canto', { tipo: opt, pts: game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos, valor_pts: ptsToque });
        await window.UI.alert(`🗣️ Tú: ¡${labelToque}!<br>(Esperando respuesta del rival...)`);
        renderJuego();
        return;
    }
    
    const oponenteTieneFlor = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).tieneFlor;
    if (oponenteTieneFlor) {
        await window.UI.alert(`🗣️ Tú: ¡${labelToque}!<br>🤖 Rival: ¡Tengo FLOR! (Anula tu toque. La IA cobra 3 pts de su Flor).`);
        game.puntosPartido.oponente += 3;
        game.envidoCantado = true;
        game.fase = 'truco';
        if(await verificarLimitesPartido()) return;
        renderJuego();
        return;
    }

    game.envidoCantado = true;
    const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).puntos;
    const tusPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
    
    // Bot mejorado (Táctico): Evalúa si quiere, si se achica o si RE-VIRA
    let botCantoRelleno = 'no'; // 'no', 'si', 'real'
    
    // ESTRATEGIA 17: KAMIKAZE FALTA (Si pierde por mucho, se la juega todas)
    const diferencia = game.puntosPartido.jugador - game.puntosPartido.oponente;
    const esKamikaze = diferencia > 10;

    if (opt === 'falta_envido') {
        if (misPtos >= 30 || (esKamikaze && misPtos >= 24)) botCantoRelleno = 'si';
    } else if (opt === 'real_envido') {
        if (misPtos >= 32) botCantoRelleno = 'real';
        else if (misPtos >= 28 || (esKamikaze && misPtos >= 24)) botCantoRelleno = 'si';
    } else {
        // ESTRATEGIA 20: CANTO INVERSO (Baiting con Envido si es muy alto)
        if (misPtos >= 30) botCantoRelleno = 'real';
        else if (misPtos >= 25 || (esKamikaze && misPtos >= 20)) botCantoRelleno = 'si';
    }

    if (botCantoRelleno === 'no') {
        await window.UI.alert(`🗣️ Tú: ¡${labelToque}!<br>🤖 Rival: No quiero.`);
        game.puntosPartido.jugador += 1; 
    } else if (botCantoRelleno === 'real' && opt !== 'falta_envido' && opt !== 'real_envido') {
        // REVIRE
        await window.UI.alert(`🗣️ Tú: ¡${labelToque}!<br>🤖 Rival: ¡REAL ENVIDO!`);
        const quiereReal = await window.UI.confirm(`🤖 IA te cruzó REAL ENVIDO.<br><br>Tus puntos: ${tusPtos}<br>¿Querés? (5 pts en juego si aceptás)`);
        if (quiereReal) {
            game.recordarPuntosRival(tusPtos, false);
            game.analizarBluff(tusPtos, true); // Probar si el humano mintió
            window.shakeCards();
            await window.UI.alert(`🤖 IA muestra: ${misPtos} pts.`);
            if (tusPtos > misPtos || (tusPtos === misPtos && game.manoDelPartido === 'jugador')) {
                await window.UI.alert(`¡Tus ${tusPtos} le ganaron! (+5 pts)`);
                game.puntosPartido.jugador += 5;
            } else {
                await window.UI.alert(`¡La IA te durmió con ${misPtos}! (+5 pts)`);
                game.puntosPartido.oponente += 5;
            }
        } else {
            game.puntosPartido.oponente += 2; 
        }
    } else {
        game.recordarPuntosRival(tusPtos, false);
        game.analizarBluff(tusPtos, true);
        window.vibrateAction(200);
        window.shakeCards();
        await window.UI.alert(`🗣️ Tú: ¡${labelToque}!<br>🤖 Rival: ¡QUIERO con ${misPtos}!`);
        if (tusPtos > misPtos || (tusPtos === misPtos && game.manoDelPartido === 'jugador')) {
            await window.UI.alert(`Tus ${tusPtos} le ganaron a sus ${misPtos}.<br>¡Cobrás ${ptsToque} Pts!`);
            game.puntosPartido.jugador += ptsToque;
        } else {
            await window.UI.alert(`Sus ${misPtos} te durmieron (Tú tenías ${tusPtos}).<br>IA cobra ${ptsToque} Pts.`);
            game.puntosPartido.oponente += ptsToque;
        }
    }
    
    if(await verificarLimitesPartido()) return;
    game.fase = 'truco'; 
    renderJuego();
});

document.getElementById('btn-flor').addEventListener('click', async () => {
    if (game.manoJugador.length !== 3 || game.envidoCantado || window.isAwaitingStateSync) return;
    
    // FLOR
    if (window.modoJuego === 'multiplayer') {
        window.isAwaitingStateSync = true;
        window.startSyncTimeout();
        game.envidoCantado = true;
        enviarAccionFirebase('accion', { tipo: 'canta_flor', pts: game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos });
        await window.UI.alert("🗣️ Tú: ¡Flor!<br>(Esperando para ver si el rival cruza otra Flor por red...)");
        game.fase = 'truco';
        renderJuego();
        return;
    }
    
    const opFlor = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).tieneFlor;
    
    if (opFlor) {
        const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).puntos;
        const tusPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
        
        const contraFlor = await window.UI.confirm(`🗣️ Tú: ¡Flor!<br>🤖 Rival: ¡Con Flor me achico! (También tiene Flor).<br><br>¿Te le animás a gritarle CONTRA FLOR AL RESTO?`, "Choque de Flores");
        if (contraFlor) {
            window.shakeCards();
            await window.UI.alert(`🗣️ Tú: ¡CONTRA FLOR AL RESTO, che!<br>🤖 Rival: ...Quiero vale.`);
            let lider = Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
            let premio = game.config.limitePuntos - lider; 
            
            let texto = `Tus ${tusPtos} de Flor contra sus ${misPtos} de Flor...<br><br>`;
            if (tusPtos > misPtos || (tusPtos === misPtos && game.manoDelPartido === 'jugador')) {
                await window.UI.alert(texto + `¡Tu Flor lo dejó pagando! (+${premio} Pts)`);
                game.puntosPartido.jugador += premio;
            } else {
                await window.UI.alert(texto + `¡La Flor de la máquina te partió al medio! (+${premio} Pts pa' la IA)`);
                game.puntosPartido.oponente += premio;
            }
        } else {
            await window.UI.alert(`Nadie agitó. Cada uno se guarda 3 puntitos al bolso en paz.`);
            game.puntosPartido.jugador += 3;
            game.puntosPartido.oponente += 3;
        }
    } else {
        await window.UI.alert("🗣️ Tú: ¡Flor!<br>🤖 Rival: ¡Esa Flor es tuya tigre!<br>(Oponente no tiene y cobrás 3 pts limpitos).");
        game.puntosPartido.jugador += 3;
    }

    if(await verificarLimitesPartido()) return;
    game.envidoCantado = true;
    game.fase = 'truco'; 
    renderJuego();
});

document.getElementById('btn-truco').addEventListener('click', async () => {
    if (game.apuestaTruco.turnoCantar === 'oponente' || window.isAwaitingStateSync) {
        if (!window.isAwaitingStateSync) await window.UI.alert("El rival tiene el control ahora. Solo él puede subirle el tono al Truco.");
        return;
    }

    let p = game.apuestaTruco;
    let canto = '';
    let sigValor = 0;
    let sigNivel = '';
    
    if (p.estado === 'nada') { canto = 'Truco'; sigValor = 2; sigNivel = 'truco'; }
    else if (p.estado === 'truco') { canto = 'Retruco'; sigValor = 3; sigNivel = 'retruco'; }
    else if (p.estado === 'retruco') { canto = 'Vale Cuatro'; sigValor = 4; sigNivel = 'vale4'; }
    else { await window.UI.alert("Ya están en las nubes, no hay más que Vale 4."); return; }

    if (window.modoJuego === 'multiplayer') {
        window.isAwaitingStateSync = true;
        window.startSyncTimeout();
        window.audio.play('truco');
        enviarAccionFirebase('canto', { tipo: 'truco', nivel: p.estado, sigValor: sigValor, sigNivel: sigNivel, canto: canto });
        await window.UI.alert(`🗣️ Tú: ¡${canto}!<br>(Esperando respuesta por la red...)`);
        game.apuestaTruco.turnoCantar = 'oponente';
        game.fase = 'truco';
        renderJuego();
        return;
    }

    // IA mejorada: Evalúa si quiere, se va al mazo o CANTA RETRUCO
    game.registrarAccionRival('canto', 'truco');
    const poderMano = game.evaluarPoderMano(game.manoOponente);
    const rivalEsMentiroso = game.perfilRival.bluffsDetectados > 1;
    const sospechaRapidez = (window.lastPlayerPlayTime && (Date.now() - window.lastPlayerPlayTime < 1500)) ? 10 : 0;

    let decision = 'no'; // 'no', 'si', 'voto'
    if (poderMano > 80) decision = 'voto';
    else if (poderMano > (rivalEsMentiroso ? (10 - sospechaRapidez) : (25 - sospechaRapidez))) decision = 'si'; 

    if (decision === 'voto' && sigNivel !== 'vale4') {
        const nextCanto = sigNivel === 'truco' ? 'RETRUCO' : (sigNivel === 'retruco' ? 'VALE 4' : '');
        const nextVal = sigNivel === 'truco' ? 3 : 4;
        const nextTarget = sigNivel === 'truco' ? 'retruco' : 'vale4';

        await window.UI.alert(`🗣️ Tú: ¡${canto}!<br>🤖 Rival: ¡${nextCanto}! (Se agrandó el bot)`);
        const quiereSuba = await window.UI.confirm(`🤖 IA te cruzó ${nextCanto}.<br>¿Te la aguantás? (${nextVal} pts en juego)`);
        if (quiereSuba) {
            window.shakeCards();
            game.apuestaTruco.valor = nextVal;
            game.apuestaTruco.estado = nextTarget;
            game.apuestaTruco.turnoCantar = 'oponente'; 
        } else {
            game.puntosPartido.oponente += (nextVal - 1);
            game.rondaTerminada = true;
            renderJuego();
            await window.manejarFinDeRondaUI();
            return;
        }
    } else if (decision === 'si') {
        window.shakeCards();
        await window.UI.alert(`🗣️ Tú: ¡Canto ${canto}!<br>🤖 Rival: ¡QUIERO!`);
        game.apuestaTruco.valor = sigValor;
        game.apuestaTruco.estado = sigNivel;
        game.apuestaTruco.turnoCantar = 'oponente'; 
        
        const btn = document.getElementById('btn-truco');
        if(sigNivel === 'truco') btn.innerText = "Gritar Retruco";
        if(sigNivel === 'retruco') btn.innerText = "Gritar Vale 4";
        
        game.fase = 'truco'; 
        renderJuego();
    } else {
        await window.UI.alert(`🗣️ Tú: ¡Canto ${canto}!<br>🤖 Rival: Son buenas, me voy al mazo.`);
        game.puntosPartido.jugador += game.apuestaTruco.valor; 
        game.rondaTerminada = true;
        renderJuego();
        await window.manejarFinDeRondaUI();
    }
});

document.getElementById('btn-mazo').addEventListener('click', async () => {
    if (game.rondaTerminada) return;
    
    const meMazo = await window.UI.confirm("¿Te achicás al mazo y le regalás la mano al rival, bo?");
    if (meMazo) {
        game.rondaTerminada = true;
        
        let ptsCastigo = 1;
        let razon = "te fuiste porque pintó fea";
        if (game.manoJugador.length === 3) {
            ptsCastigo = 2;
            razon = "te fuiste corriendo sin tirar ni una";
        }
        
        if (window.modoJuego === 'multiplayer') {
            game.puntosPartido.oponente += ptsCastigo; 
            enviarAccionFirebase('accion', { tipo: 'mazo', cost: ptsCastigo });
            await window.UI.alert(`Te achicaste al mazo 🏳️. +${ptsCastigo} Pts pal Oponente por red.`);
            if(await verificarLimitesPartido()) return;
            if (miRol === 'creador') sincronizarEstadoMotor();
            renderJuego();
            await window.manejarFinDeRondaUI();
            return;
        }

        game.puntosPartido.oponente += ptsCastigo; 
        
        await window.UI.alert(`Te achicaste al mazo 🏳️.<br>+${ptsCastigo} Pts pal Oponente (${razon}).`);
        
        if(await verificarLimitesPartido()) return;
        renderJuego();
        await window.manejarFinDeRondaUI();
    }
});

document.getElementById('btn-repartir').addEventListener('click', () => {
    document.getElementById('btn-repartir').style.display = 'none';
    document.getElementById('btn-truco').innerText = "Gritar Truco";
    
    if (window.modoJuego === 'multiplayer') {
        if (typeof miRol !== 'undefined' && miRol === 'invitado') {
            enviarAccionFirebase('accion', { tipo: 'repartir' });
            logJugada("⏳ Tú mezclas el mazo...", 'sistema');
            return;
        } else {
            game.iniciarRonda();
            sincronizarEstadoMotor();
        }
    } else {
        game.iniciarRonda();
    }
    
    renderJuego();
    
    if (game.turno === 'oponente' && window.modoJuego === 'singleplayer') {
        setTimeout(async () => { await jugarBot(); }, 900);
    }
});

document.getElementById('btn-senas').addEventListener('click', () => {
    document.getElementById('modal-senas').style.display = 'block';
    document.getElementById('overlay-senas').style.display = 'block';
});
document.getElementById('btn-cerrar-senas').addEventListener('click', () => {
    document.getElementById('modal-senas').style.display = 'none';
    document.getElementById('overlay-senas').style.display = 'none';
});
document.getElementById('overlay-senas').addEventListener('click', () => {
    document.getElementById('modal-senas').style.display = 'none';
    document.getElementById('overlay-senas').style.display = 'none';
});

// Reglamento
document.getElementById('btn-ver-reglamento').addEventListener('click', () => {
    document.getElementById('modal-senas').style.display = 'none';
    document.getElementById('overlay-senas').style.display = 'none';
    document.getElementById('modal-reglamento').style.display = 'block';
    document.getElementById('overlay-reglamento').style.display = 'block';
});
document.getElementById('btn-cerrar-reglamento').addEventListener('click', () => {
    document.getElementById('modal-reglamento').style.display = 'none';
    document.getElementById('overlay-reglamento').style.display = 'none';
});
document.getElementById('overlay-reglamento').addEventListener('click', () => {
    document.getElementById('modal-reglamento').style.display = 'none';
    document.getElementById('overlay-reglamento').style.display = 'none';
});

window.manejarFinDeRondaUI = async function() {
    if (await verificarLimitesPartido()) return; // Si terminó el partido
    
    clearInterval(autoRepartirInterval);
    
    if (window.modoJuego === 'multiplayer') {
        const yoRepartoProxima = (game.manoDelPartido === 'jugador');
        if (yoRepartoProxima) {
            const btn = document.getElementById('btn-repartir');
            btn.style.display = 'block';
            btn.innerText = "🔄 Repartir (5s)";
            
            let count = 5;
            autoRepartirInterval = setInterval(() => {
                count--;
                btn.innerText = `🔄 Repartir (${count}s)`;
                if (count <= 0) {
                    clearInterval(autoRepartirInterval);
                    btn.click();
                }
            }, 1000);
        } else {
            document.getElementById('btn-repartir').style.display = 'none';
            if (document.getElementById('modal-custom').style.display !== 'block') {
                logJugada("⏳ Esperando a que el rival reparta las cartas...", 'sistema');
            }
        }
    } else {
        document.getElementById('btn-repartir').style.display = 'block'; 
    }
};

window.guardarConfig = function() {
    game.config.nombreJugador = document.getElementById('config-name-yo').value.trim() || "TÚ";
    game.config.nombreOponente = document.getElementById('config-name-rival').value.trim() || "RIVAL";
    game.config.limitePuntos = parseInt(document.getElementById('config-limite').value) || 30;
    
    // Config de Sonido y Vibración
    if (window.audio) {
        window.audio.muted = !document.getElementById('config-sound').checked;
    }
    game.config.vibration = document.getElementById('config-vibrate').checked;

    document.getElementById('modal-config').style.display = 'none';
    document.getElementById('overlay-custom').style.display = 'none';
    
    renderJuego();
};

window.vibrateAction = function(ms = 50) {
    if (game.config.vibration && navigator.vibrate) {
        navigator.vibrate(ms);
    }
};

window.abrirConfig = function() {
    document.getElementById('config-name-yo').value = game.config.nombreJugador;
    document.getElementById('config-name-rival').value = game.config.nombreOponente;
    document.getElementById('config-limite').value = game.config.limitePuntos;
    
    if (window.audio) {
        document.getElementById('config-sound').checked = !window.audio.muted;
    }
    document.getElementById('config-vibrate').checked = !!game.config.vibration;

    document.getElementById('modal-config').style.display = 'block';
    document.getElementById('overlay-custom').style.display = 'block';
};

window.toggleScoreModal = function() {
    // Si tocan directamente el banner, activarlo permanentemente también
    toggleMarcadorGlobal();
};

window.abandonarSala = async function() {
    const seguro = await window.UI.confirm("¿Estás seguro que querés abandonar el partido y salir a la pantalla principal?", "Cagazo Inminente");
    if (seguro) {
        if (window.modoJuego === 'multiplayer') {
            if (miRol === 'creador') window.finalizarSalaFirebase();
            enviarAccionFirebase('abandonar_sala');
        }
        location.reload();
    }
};
