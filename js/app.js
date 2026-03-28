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
const TURN_TIME = 25; // 25 Segundos para jugar

window.resetTimer = function() {
    clearInterval(turnTimerInterval);
    const container = document.getElementById('turn-timer-container');
    const bar = document.getElementById('turn-timer-bar');
    if(container) container.style.display = 'none';
    if(bar) bar.style.width = '100%';
};

window.startTurnTimer = function() {
    window.resetTimer();
    if (window.modoJuego !== 'multiplayer') return;
    
    // Solo si el juego está en curso y es turno del jugador
    if (game.turno === 'jugador' && !game.rondaTerminada && game.partidoIniciado) {
        let timeLeft = TURN_TIME;
        const container = document.getElementById('turn-timer-container');
        const bar = document.getElementById('turn-timer-bar');
        
        if (container) container.style.display = 'block';
        if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '100%';
            setTimeout(() => {
                bar.style.transition = `width ${TURN_TIME}s linear`;
                bar.style.width = '0%';
            }, 50); // Pequeño delay para que el CSS reset tome efecto
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
    window.audio.play('card-deal');
    renderJuego();
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

function renderJuego() {
    const oppHandEl = document.getElementById('opponent-hand');
    oppHandEl.innerHTML = '';
    game.manoOponente.forEach(c => {
        oppHandEl.appendChild(crearCartaDOM(c, true));
    });

    const plyHandEl = document.getElementById('player-hand');
    if(plyHandEl) plyHandEl.innerHTML = '';
    game.manoJugador.forEach((c, index) => {
        const cardDOM = crearCartaDOM(c, false);
        if (game.manoJugador.length === 3 && !game.mesa.jugador && !game.mesa.oponente) {
            cardDOM.classList.add('animate-deal');
            cardDOM.style.animationDelay = `${index * 0.15}s`;
        }
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
        btnTogglePuntos.style.display = game.partidoIniciado ? 'block' : 'none';
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

async function jugarUI(indexCarta) {
    if (game.turno !== 'jugador' || game.rondaTerminada) return;
    
    const c = game.manoJugador[indexCarta];
    const nombre= c.getNombreCriollo(game.paloMuestra, game.piezasActivas);
    logJugada(`🃏 Jugaste ${nombre}`, 'propio');
    window.audio.play('card-play');
    
    const cartaAprobada = game.jugarCarta('jugador', indexCarta);
    if (!cartaAprobada) return;
    
    if (window.modoJuego === 'multiplayer') {
        enviarAccionFirebase('jugar_carta', { index: indexCarta });
        sincronizarEstadoMotor();
    }
    
    renderJuego();

    if (!game.mesa.oponente) {
        if (window.modoJuego === 'singleplayer') {
            setTimeout(async () => { await jugarBot(); }, 600);
        }
    } else {
        await verificarResolucionMesa();
        if (window.modoJuego === 'multiplayer') sincronizarEstadoMotor();
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
    
    const proba = Math.random();
    const objIA = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente);
    const objJG = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador);
    
    if (game.manoOponente.length === 3 && objIA.tieneFlor && !game.envidoCantado) {
        game.envidoCantado = true;
        if (objJG.tieneFlor) {
            const contra = await window.UI.confirm("🤖 IA: ¡Tengo FLOR, papá!<br><br>Tú también tienes Flor.<br>¿Te le animás a gritarle CONTRA FLOR AL RESTO?");
            if (contra) {
                await window.UI.alert(`🗣️ Tú: ¡CONTRA FLOR AL RESTO, che!<br>🤖 Rival: ...Quiero vale.`);
                let lider = Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
                let premio = game.config.limitePuntos - lider; 
                let texto = `Tus ${objJG.puntos} de Flor contra sus ${objIA.puntos} de Flor...<br><br>`;
                if (objJG.puntos > objIA.puntos || (objJG.puntos === objIA.puntos && game.manoDelPartido === 'jugador')) {
                    await window.UI.alert(texto + `¡Tu Flor lo dejó pagando! (+${premio} Pts)`);
                    game.puntosPartido.jugador += premio;
                } else {
                    await window.UI.alert(texto + `¡La Flor de la máquina te partió al medio! (+${premio} Pts pa' la IA)`);
                    game.puntosPartido.oponente += premio;
                }
            } else {
                await window.UI.alert("🤖 IA: Nadie agitó.<br>Las dos Flores cobran 3 y en paz.");
                game.puntosPartido.oponente += 3;
                game.puntosPartido.jugador += 3;
            }
        } else {
            logJugada("🤖 IA: ¡FLORcita para los nenes!", 'rival');
            game.puntosPartido.oponente += 3;
        }
        if(await verificarLimitesPartido()) return;
        renderJuego();
    }
    else if (game.manoOponente.length === 3 && !game.envidoCantado && proba > 0.8) {
        const susPtos = objIA.puntos;
        if (susPtos >= 27 && !game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).tieneFlor) {
            game.envidoCantado = true;
            const quiereEnv = await window.UI.confirm(`🤖 IA: ¡Toco Envido! (La IA te tocó la mesa)<br><br>Tus puntos: ${game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos} pts<br><br>¿Te le plantás?`, "Desafío de IA");
            if (quiereEnv) {
                await window.UI.alert(`🗣️ Tú: ¡QUIERO!<br>La máquina muestra: ${susPtos} puntos.`);
                const yoGano = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos > susPtos || (game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos === susPtos && game.manoDelPartido === 'jugador');
                if (!yoGano) {
                    await window.UI.alert(`¡La máquina te durmió en el Envido!<br>(+2 Pts)`);
                    game.puntosPartido.oponente += 2;
                } else {
                    await window.UI.alert(`¡Le tapaste la boca a la IA!<br>(+2 Pts)`);
                    game.puntosPartido.jugador += 2;
                }
            } else {
                logJugada("🗣️ Tú: Son buenas. (IA rasca 1 pt)", 'sistema');
                game.puntosPartido.oponente += 1;
            }
            if(await verificarLimitesPartido()) return;
            game.fase = 'truco'; 
            renderJuego();
        }
    } else if (game.apuestaTruco.estado === 'nada' && proba > 0.9) {
        const quiereT = await window.UI.confirm("🤖 IA: ¡TRUCO! (Te apura en la primera)<br><br>¿Le dás el Quiero?", "¡Truco de la Máquina!");
        if (quiereT) {
            await window.UI.alert("🗣️ Tú: ¡QUIERO vale!");
            game.apuestaTruco.valor = 2;
            game.apuestaTruco.estado = 'truco';
            game.apuestaTruco.turnoCantar = 'jugador';
            document.getElementById('btn-truco').innerText = "Gritar Retruco";
            game.fase = 'truco';
        } else {
            logJugada("🗣️ Tú: Son buenas. (IA gana el Truco)", 'sistema');
            game.puntosPartido.oponente += 1;
            game.rondaTerminada = true;
            if(await verificarLimitesPartido()) return;
            renderJuego();
            document.getElementById('btn-repartir').style.display = 'block';
            return;
        }
    }

    const randIdx = Math.floor(Math.random() * game.manoOponente.length);
    game.jugarCarta('oponente', randIdx);
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
                window.sincronizarEstadoMotor();
            }
            
            if(await verificarLimitesPartido()) return;
            
            renderJuego(); 
            logJugada(`🔔 ${txt.replace(/<br>/g, ' ')}`, 'sistema');
            
            await window.manejarFinDeRondaUI();
        } else {
            if (game.turno === 'oponente' && window.modoJuego === 'singleplayer') {
                setTimeout(async () => { await jugarBot(); }, 400);
            }
        }
    }
}

document.getElementById('btn-envido').addEventListener('click', async () => {
    if (game.manoJugador.length !== 3 || game.envidoCantado) return;
    
    if (window.modoJuego === 'multiplayer') {
        game.envidoCantado = true;
        window.audio.play('envido');
        enviarAccionFirebase('canto', { tipo: 'envido', pts: game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos });
        await window.UI.alert("🗣️ Tú: ¡Toco Envido!<br>(Esperando la respuesta del rival por la red...)");
        renderJuego();
        return;
    }
    
    const oponenteTieneFlor = game.calcularPuntosEnvidoFlor(game.manoInicialOponente || game.manoOponente).tieneFlor;
    if (oponenteTieneFlor) {
        await window.UI.alert("🗣️ Tú: ¡Toco Envido!<br>🤖 Rival: ¡Tengo FLOR, papá! (La Flor anula el Toco. La IA embolsa 3 pts automáticos).");
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
    
    let botRespuesta = 'no_quiero';
    if (misPtos >= 32) botRespuesta = 'falta';
    else if (misPtos >= 30) botRespuesta = 'real';
    else if (misPtos >= 28) botRespuesta = 'envido';
    else if (misPtos >= 24) botRespuesta = 'quiero';

    let ptsEnJuego = 2; 

    const resolverEnvido = async (ptsJug, ptsOp, premio) => {
        let msg = `Tus ${ptsJug} contra sus ${ptsOp}.<br>`;
        if (ptsJug > ptsOp || (ptsJug === ptsOp && game.manoDelPartido === 'jugador')) {
            await window.UI.alert(msg + `¡Tú ganas este desafío! (+${premio} Pts)`);
            game.puntosPartido.jugador += premio;
        } else {
            await window.UI.alert(msg + `¡Él gana este desafío! (+${premio} Pts)`);
            game.puntosPartido.oponente += premio;
        }
    };

    if (botRespuesta === 'no_quiero') {
        await window.UI.alert(`🗣️ Tú: ¡Toco!<br>🤖 Rival: Son buenas (NO QUIERO).`);
        game.puntosPartido.jugador += 1;
    } else if (botRespuesta === 'quiero') {
        await window.UI.alert(`🗣️ Tú: ¡Toco!<br>🤖 Rival: ¡QUIERO!`);
        await resolverEnvido(tusPtos, misPtos, ptsEnJuego);
    } else {
        let nombreCanto = '';
        if (botRespuesta === 'envido') { nombreCanto = 'Envido Envido'; ptsEnJuego = 4; }
        if (botRespuesta === 'real') { nombreCanto = 'Real Envido'; ptsEnJuego = 5; }
        if (botRespuesta === 'falta') { 
            nombreCanto = 'Falta Envido'; 
            let lider = Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
            let mitad = Math.floor(game.config.limitePuntos / 2);
            if (game.puntosPartido.jugador < mitad && game.puntosPartido.oponente < mitad) {
                ptsEnJuego = game.config.limitePuntos;
                nombreCanto = "Falta Envido (¡Todo por todo en las MALAS!)";
            } else {
                ptsEnJuego = game.config.limitePuntos - lider;
                if (ptsEnJuego <= 0) ptsEnJuego = 1; 
                nombreCanto = `Falta Envido (${ptsEnJuego} pts pa' terminar el partido)`;
            }
        }

        const quieroSube = await window.UI.confirm(`🗣️ Tú: ¡Toco!<br>🤖 Rival: ¡${nombreCanto}! (${ptsEnJuego} pts en juego)<br><br>¿Te achicás o le das el Quiero?`, "¡El Oponente Retruca en Envido!");
        
        if (quieroSube) {
            await window.UI.alert(`🗣️ Tú: ¡Dale, QUIERO!`);
            await resolverEnvido(tusPtos, misPtos, ptsEnJuego);
        } else {
            await window.UI.alert(`🗣️ Tú: Son buenas.<br>🤖 Rival muerde 2 Pts por hacerte achicar.`);
            game.puntosPartido.oponente += 2; 
        }
    }
    
    if(await verificarLimitesPartido()) return;
    game.fase = 'truco'; 
    renderJuego();
});

document.getElementById('btn-flor').addEventListener('click', async () => {
    if (game.manoJugador.length !== 3 || game.envidoCantado) return;
    
    // FLOR
    if (window.modoJuego === 'multiplayer') {
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
    if (game.apuestaTruco.turnoCantar === 'oponente') {
        await window.UI.alert("El rival tiene el control ahora. Solo él puede subirle el tono al Truco.");
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
        window.audio.play('truco');
        enviarAccionFirebase('canto', { tipo: 'truco', nivel: p.estado, sigValor: sigValor, sigNivel: sigNivel, canto: canto });
        await window.UI.alert(`🗣️ Tú: ¡${canto}!<br>(Esperando respuesta por la red...)`);
        game.apuestaTruco.turnoCantar = 'oponente';
        game.fase = 'truco';
        renderJuego();
        return;
    }

    const aceptaIA = Math.random() > 0.4; 
    
    if (aceptaIA) {
        await window.UI.alert(`🗣️ Tú: ¡Canto ${canto}!<br>🤖 Rival: ¡QUIERO VALE!`);
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
    
    if (window.modoJuego === 'multiplayer') {
        const yoRepartoProxima = (game.manoDelPartido === 'jugador');
        if (yoRepartoProxima) {
            document.getElementById('btn-repartir').style.display = 'block';
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
    
    document.getElementById('modal-config').style.display = 'none';
    document.getElementById('overlay-custom').style.display = 'none';
    
    renderJuego();
};

window.abrirConfig = function() {
    document.getElementById('config-name-yo').value = game.config.nombreJugador;
    document.getElementById('config-name-rival').value = game.config.nombreOponente;
    document.getElementById('config-limite').value = game.config.limitePuntos;

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
            enviarAccionFirebase('abandonar_sala');
        }
        location.reload();
    }
};
