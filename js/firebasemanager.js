// js/firebaseManager.js
const firebaseConfig = {
    apiKey: "AIzaSyDm0Je0uB5ejXh5e9ZCApWQBBQgbVyPigI",
    authDomain: "truco-25629.firebaseapp.com",
    databaseURL: "https://truco-25629-default-rtdb.firebaseio.com",
    projectId: "truco-25629",
    storageBucket: "truco-25629.firebasestorage.app",
    messagingSenderId: "828862963964",
    appId: "1:828862963964:web:c505946d1e30420af23779"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Servidor Firebase Conectado");
} catch(e) {
    console.error("Error inicializando Firebase", e);
}

const db = firebase.database();
let miRol = null; 
let codigoSalaActual = null;
let roomSubscription = null;
window.myActionSeq = 0;
window.expectedRivalSeq = 0;
window.actionQueue = []; 
window.esperandoRespuestaRevancha = false;

// Persistencia de Sesión
function guardarSesionLocal(codigo, rol) {
    localStorage.setItem('truco_room_code', codigo);
    localStorage.setItem('truco_role', rol);
}

function borrarSesionLocal() {
    localStorage.removeItem('truco_room_code');
    localStorage.removeItem('truco_role');
}

// Escuchar salas públicas en tiempo real
db.ref('salas').orderByChild('estado').equalTo('esperando').on('value', (snap) => {
    const container = document.getElementById('lista-salas-publicas');
    if (!container) return;
    
    container.innerHTML = '';
    let count = 0;
    
    if (snap.exists()) {
        snap.forEach(child => {
            const data = child.val();
            if (data.publica) {
                count++;
                const item = document.createElement('div');
                item.className = 'glass';
                item.style.padding = '10px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.marginBottom = '5px';
                item.style.background = 'rgba(255,255,255,0.05)';
                item.style.border = '1px solid rgba(26, 188, 156, 0.3)';
                item.style.cursor = 'pointer';
                item.onclick = () => unirseSalaFirebase(child.key, true);
                
                item.innerHTML = `
                    <div style="text-align: left;">
                        <span style="color: var(--gold); font-weight: bold;">${child.key}</span><br>
                        <span style="font-size: 0.7rem; color: #aaa;">Host: ${data.creadorName || 'Jugador'}</span>
                    </div>
                    <button class="btn-action" style="padding: 5px 10px; font-size: 0.7rem;">UNIRSE</button>
                `;
                container.appendChild(item);
            }
        });
    }
    
    if (count === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #888; font-style: italic;">No hay salas públicas activas...</p>';
    }
});

function generarCodigo() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Invierte la perspectiva del juego para el invitado afin de que siempre vea su lado como 'jugador'.
 */
function aislarManoParaInvitado(gameObj) {
    if (!gameObj) return null;
    return {
        ...gameObj,
        manoJugador: gameObj.manoOponente || [],
        manoOponente: gameObj.manoJugador || [],
        manoInicialJugador: gameObj.manoInicialOponente || [],
        manoInicialOponente: gameObj.manoInicialJugador || [],
        puntosPartido: {
            jugador: gameObj.puntosPartido?.oponente || 0,
            oponente: gameObj.puntosPartido?.jugador || 0
        },
        turno: gameObj.turno === 'jugador' ? 'oponente' : 'jugador',
        mesa: {
            jugador: gameObj.mesa?.oponente || null,
            oponente: gameObj.mesa?.jugador || null
        },
        manoDelPartido: gameObj.manoDelPartido === 'jugador' ? 'oponente' : 'jugador',
        registroBazas: (gameObj.registroBazas || []).map(baza => {
            if (baza === 'jugador') return 'oponente';
            if (baza === 'oponente') return 'jugador';
            return baza;
        }),
        manosGanadas: {
            jugador: gameObj.manosGanadas?.oponente || 0,
            oponente: gameObj.manosGanadas?.jugador || 0,
            empates: gameObj.manosGanadas?.empates || 0
        },
        apuestaTruco: {
            ...gameObj.apuestaTruco,
            turnoCantar: gameObj.apuestaTruco?.turnoCantar === 'jugador' ? 'oponente' : (gameObj.apuestaTruco?.turnoCantar === 'oponente' ? 'jugador' : 'ambos')
        },
        config: {
            ...gameObj.config,
            nombreJugador: gameObj.config?.nombreOponente || "RIVAL",
            nombreOponente: gameObj.config?.nombreJugador || "TÚ"
        }
    };
}

function ocultarMenusOnline() {
    const mm = document.getElementById('menu-multi');
    const oc = document.getElementById('overlay-custom');
    if (mm) mm.style.display = 'none';
    if (oc) oc.style.display = 'none';
}

/**
 * Crea una sala nueva en Firebase.
 */
window.crearSalaFirebase = async function(isPublica = false) {
    ocultarMenusOnline();
    window.modoJuego = 'multiplayer';
    codigoSalaActual = generarCodigo();
    miRol = 'creador';
    
    const roomRef = db.ref('salas/' + codigoSalaActual);
    
    // Limpieza automática si el creador se desconecta antes de que empiece el juego
    roomRef.onDisconnect().remove();

    roomRef.set({
        estado: 'esperando',
        publica: isPublica,
        timestamp: Date.now(),
        creadorName: game.config.nombreJugador,
        config: {
            limitePuntos: game.config.limitePuntos
        }
    }).then(() => {
        guardarSesionLocal(codigoSalaActual, miRol);
        mostrarLobbyEspera(codigoSalaActual, isPublica);
        
        // Escuchar cuando alguien se une
        roomRef.child('estado').on('value', async (snap) => {
            if (snap.val() === 'conectado') {
                // Una vez conectados, ya no removemos la sala al desconectar (queremos manejar el 'abandono')
                roomRef.onDisconnect().cancel();
                roomRef.child('estado').onDisconnect().set('jugador_desconectado');
                
                quitarLobbyEspera();
                
                document.getElementById('pantalla-inicio').style.display = 'none';
                document.getElementById('chat-container').style.display = 'block';
                document.getElementById('btn-abandonar').style.display = 'block';
                
                if (miRol === 'creador') {
                    game.iniciarRonda();
                    window.myActionSeq = 0;
                    window.expectedRivalSeq = 0;
                    sincronizarEstadoMotor();
                }
                renderJuego();
                logJugada("🎮 ¡Rival Conectado! Empieza el partido...", "sistema");
                attachTypingListener(codigoSalaActual, 'invitado');
                iniciarHeartbeat(codigoSalaActual, 'creador', 'invitado');
            }
        });
        
        // Escuchar acciones (Solo desde este milisegundo)
        const initTime = Date.now();
        roomRef.child('acciones_in').orderByChild('ts').startAt(initTime).on('child_added', procesarAccionRed);
    });
};

/**
 * Busca una sala pública o crea una si no hay.
 */
window.buscarPartidaRapida = async function() {
    ocultarMenusOnline();
    window.modoJuego = 'multiplayer';
    
    mostrarLobbyEspera("BUSCANDO...", true);
    
    db.ref('salas').orderByChild('estado').equalTo('esperando').once('value', async (snap) => {
        let salaEncontrada = null;
        if (snap.exists()) {
            snap.forEach(child => {
                const data = child.val();
                if (data.publica && !salaEncontrada) {
                    salaEncontrada = child.key;
                }
            });
        }
        
        if (salaEncontrada) {
            console.log("Conectando a sala pública: ", salaEncontrada);
            unirseSalaFirebase(salaEncontrada, true);
        } else {
            console.log("No hay públicas, creando una...");
            crearSalaFirebase(true);
        }
    });
};

/**
 * Se une a una sala existente mediante código.
 */
window.unirseSalaFirebase = async function(codigo, isPublica = false) {
    if(!codigo) { await window.UI.alert("Ingresa un código, che."); return; }
    ocultarMenusOnline();
    window.modoJuego = 'multiplayer';
    codigoSalaActual = codigo.toUpperCase();
    miRol = 'invitado';

    const roomRef = db.ref('salas/' + codigoSalaActual);

    roomRef.once('value', async (snap) => {
        if (!snap.exists()) {
            quitarLobbyEspera();
            await window.UI.alert("❌ ¡Esa sala no existe!");
            return;
        }
        const roomData = snap.val();
        if (roomData.estado !== 'esperando') {
            quitarLobbyEspera();
            if (!isPublica) await window.UI.alert("❌ La sala ya está ocupada o terminó.");
            else buscarPartidaRapida(); 
            return;
        }

        // Configurar limpieza en desconexión
        roomRef.child('estado').onDisconnect().set('jugador_desconectado');

        roomRef.update({
            estado: 'conectado',
            invitadoName: game.config.nombreJugador
        }).then(() => {
            guardarSesionLocal(codigoSalaActual, miRol);
            quitarLobbyEspera();
            document.getElementById('pantalla-inicio').style.display = 'none';
            document.getElementById('chat-container').style.display = 'block';
            document.getElementById('btn-abandonar').style.display = 'block';
            
            // Sincronización del estado del motor (el invitado solo recibe)
            roomRef.child('estado_maestro').on('value', (snap) => {
                const data = snap.val();
                if (data) asignarEstadoDesdeRed(data);
            });

            window.myActionSeq = 0;
            window.expectedRivalSeq = 0;

            // Sincronizar solo acciones nuevas
            const initTime = Date.now();
            roomRef.child('acciones_host').orderByChild('ts').startAt(initTime).on('child_added', procesarAccionRed);
            
            attachTypingListener(codigoSalaActual, 'creador');
            iniciarHeartbeat(codigoSalaActual, 'invitado', 'creador');
            
            if(isPublica) logJugada("Te conectaste a una partida al azar.", "sistema");
        });
    });
};

function plainToCarta(obj) {
    if (!obj) return null;
    if (obj.oculto) {
        // Carta "Ciega" para el rival (Anti-Cheat)
        let c = new Carta(0, 'Reverso');
        c.oculto = true;
        return c;
    }
    let c = new Carta(obj.valor, obj.palo);
    c.esPieza = obj.esPieza;
    c.poder = obj.poder;
    c.puntosEnvido = obj.puntosEnvido;
    return c;
}

function asignarEstadoDesdeRed(dataStr) {
    let rawData;
    try {
        rawData = JSON.parse(dataStr);
    } catch (e) {
        console.error("❌ Error al parsear estado de red:", e);
        window.isAwaitingStateSync = false;
        return;
    }
    const data = miRol === 'invitado' ? aislarManoParaInvitado(rawData) : rawData;
    window.lastServerData = data; // Guardamos para el renderJuego
    
    // SINCRONIZACIÓN DE SECUENCIA (Para evitar bloqueos de ID perdidos)
    if (data && typeof data.lastSeq !== 'undefined') {
        window.expectedRivalSeq = Math.max(window.expectedRivalSeq || 0, data.lastSeq);
    }
    
    if (!data) return;

    game.mazo = (data.mazo || []).map(plainToCarta);
    game.muestra = plainToCarta(data.muestra);
    game.manoJugador = (data.manoJugador || []).map(plainToCarta);
    game.manoOponente = (data.manoOponente || []).map(plainToCarta);
    game.manoInicialJugador = (data.manoInicialJugador || []).map(plainToCarta);
    game.manoInicialOponente = (data.manoInicialOponente || []).map(plainToCarta);
    game.mesa = { 
        jugador: plainToCarta(data.mesa?.jugador), 
        oponente: plainToCarta(data.mesa?.oponente) 
    };
    
    game.registroBazas = data.registroBazas || [];
    game.manosGanadas = data.manosGanadas || { jugador:0, oponente:0, empates:0 };
    game.puntosPartido = data.puntosPartido || { jugador:0, oponente:0 };
    
    // Detectar nueva ronda para disparar animación de reparto
    const isNewRound = data.idRonda > (game.idRonda || 0);
    game.idRonda = data.idRonda;
    
    game.fase = data.fase;
    game.turno = data.turno;
    game.envidoCantado = data.envidoCantado;
    game.rondaTerminada = data.rondaTerminada;
    game.apuestaTruco = data.apuestaTruco;
    game.manoDelPartido = data.manoDelPartido;
    game.partidoIniciado = data.partidoIniciado;
    game.piezasActivas = data.piezasActivas || [];
    game.paloMuestra = data.paloMuestra;
    
    // Unlock interaction as we have the latest server state
    window.isAwaitingStateSync = false;
    
    if (data.config) {
        game.config.limitePuntos = data.config.limitePuntos;
    }

    if (isNewRound) {
        window.animarReparto();
    } else if (!window.isAnimatingDeal) {
        renderJuego();
    }
    
    // Si la mano cambió (nueva ronda), aseguramos limpiar mensajes de espera
    if (data.rondaTerminada === false && game.manoJugador.length === 3 && !game.mesa.jugador && !game.mesa.oponente) {
        if (window.UI.modal && window.UI.modal.style.display === 'block') {
            // No cerramos si es un modal de decisión crítica (Truco/Envido), solo avisos
            if (window.UI.title.innerText.includes("Esperando") || window.UI.title.innerText.includes("Atención")) {
                window.UI._hide();
            }
        }
    }
    
    if (game.puntosPartido.jugador >= game.config.limitePuntos || game.puntosPartido.oponente >= game.config.limitePuntos) {
        if (!game.partidoFinalizado && typeof verificarLimitesPartido === 'function') {
            setTimeout(verificarLimitesPartido, 500);
        }
    } else if (game.rondaTerminada && typeof window.manejarFinDeRondaUI === 'function') {
        setTimeout(window.manejarFinDeRondaUI, 500);
    }
}

window.sincronizarEstadoMotor = function(extraData = {}) {
    if (modoJuego !== 'multiplayer' || miRol !== 'creador') return;
    
    // ANTI-CHEAT: Sanitización de datos sensibles antes de enviarlos a Firebase
    const snapObj = JSON.parse(JSON.stringify(game)); // Clon profundo

    // El invitado NO debe saber mis cartas (manoJugador del Host)
    if (snapObj.manoJugador) {
        snapObj.manoJugador = snapObj.manoJugador.map(() => ({ oculto: true }));
    }
    if (snapObj.manoInicialJugador) {
        snapObj.manoInicialJugador = snapObj.manoInicialJugador.map(() => ({ oculto: true }));
    }

    // El invitado NO debe saber el resto del mazo (Anti-Cheat)
    if (snapObj.mazo) {
        snapObj.mazo = snapObj.mazo.map(() => ({ oculto: true }));
    }

    if (extraData.timerStartTime) snapObj.timerStartTime = extraData.timerStartTime;
    
    const snap = JSON.stringify(snapObj);
    db.ref('salas/' + codigoSalaActual).update({ 
        estado_maestro: snap,
        lastUpdate: Date.now(),
        lastSeq: window.myActionSeq // Informar al rival cuál es mi última secuencia procesada
    }).then(() => {
        // Liberar UI del Host localmente después de sincronizar exitosamente
        desbloquearSyncLocal();
    });
};

window.enviarAccionFirebase = function(tipoAccion, payload) {
    if (modoJuego !== 'multiplayer') return;
    window.myActionSeq++; // Incrementar mi secuencia
    const target = miRol === 'creador' ? 'acciones_host' : 'acciones_in';
    const refPath = db.ref('salas/' + codigoSalaActual + '/' + target).push();

    // Feedback visual inmediato: Bloquear UI
    window.isAwaitingStateSync = true;
    window.startSyncTimeout(5000); // 5s de timeout de seguridad
    if (typeof toggleSyncOverlay === 'function') toggleSyncOverlay(true);
    if (typeof updateSyncUIState === 'function') updateSyncUIState();

    refPath.set({ 
        tipo: tipoAccion, 
        data: payload || {}, 
        sender: miRol,
        ts: Date.now(),
        seq: window.myActionSeq // Enviar el ID de secuencia
    });
};

window.desbloquearSyncLocal = function() {
    window.isAwaitingStateSync = false;
    if (typeof toggleSyncOverlay === 'function') toggleSyncOverlay(false);
    
    if (window.syncTimeout) {
        clearTimeout(window.syncTimeout);
        window.syncTimeout = null;
    }
    renderJuego();
};

window.finalizarSalaFirebase = function() {
    if (modoJuego !== 'multiplayer' || !codigoSalaActual) return;
    detenerHeartbeat();
    db.ref('salas/' + codigoSalaActual).update({
        estado: 'finalizado',
        finTs: Date.now()
    });
    borrarSesionLocal();
};

async function procesarAccionRed(snap) {
    const accion = snap.val();
    if (!accion || accion.sender === miRol) return; // Ignorar mis propias acciones reenviadas
    
    // VALIDACIÓN DE SECUENCIA PARA EVITAR REPETICIONES U OMISIONES
    if (accion.seq <= window.expectedRivalSeq) {
        console.warn(`Mensaje repetido o viejo ignorado: ${accion.tipo} (Seq: ${accion.seq}, Esperábamos > ${window.expectedRivalSeq})`);
        return; 
    }
    
    // Si hay un salto, lo ideal sería pedir re-sincronización, pero aquí simplemente logueamos y actualizamos
    if (accion.seq > window.expectedRivalSeq + 1) {
        console.error(`¡Salto de secuencia detectado! (${window.expectedRivalSeq} -> ${accion.seq}). Posible pérdida de paquetes.`);
    }
    
    window.expectedRivalSeq = accion.seq; // Actualizar secuencia esperada

    // Evitar procesar paquetes muy viejos (más de 10s de lag) para no causar desincronización
    const delta = Date.now() - accion.ts;
    
    const t = accion.tipo;
    const d = accion.data;
    
    if (t === 'jugar_carta') {
        window.resetTimer(); // El rival ya jugó, paro mi espera visual
        const cartaJugada = game.jugarCarta('oponente', d.index);
        if (cartaJugada) {
            const nombre = cartaJugada.getNombreCriollo(game.paloMuestra, game.piezasActivas);
            logJugada(`🌐 Rival juega ${nombre}`, 'rival');
        }
        renderJuego();
        
        if (miRol === 'creador') {
            sincronizarEstadoMotor({ timerStartTime: Date.now() }); 
            if (game.mesa.jugador && game.mesa.oponente) {
                await verificarResolucionMesa(); 
                sincronizarEstadoMotor({ timerStartTime: Date.now() });
            }
        }
    }
    // ... resto del switch de acciones adaptado ...
    else if (t === 'canto') {
        window.resetTimer();
        if (d.tipo === 'envido') {
            game.envidoCantado = true;
            procesarCantoEnvidoRed(d);
        }
        else if (d.tipo === 'truco') {
            window.audio.play('truco');
            procesarCantoTrucoRed(d);
        }
    }
    else if (t === 'canto_subida') {
        window.audio.play('truco'); // Los gritos de subida también disparan sonido
        window.resetTimer();
        procesarCantoSubidaRed(d);
    }
    else if (t === 'respuesta_canto') {
        window.resetTimer();
        procesarRespuestaCantoRed(d);
        if (miRol === 'creador') sincronizarEstadoMotor();
    }
    else if (t === 'accion') {
        if (d.tipo === 'mazo') {
            await window.UI.alert("🌐 Rival se fue al mazo.");
            if (miRol === 'creador') {
                game.puntosPartido.jugador += d.cost;
                game.rondaTerminada = true;
                sincronizarEstadoMotor();
            }
            game.rondaTerminada = true;
            renderJuego();
            await window.manejarFinDeRondaUI();
        } else if (d.tipo === 'canta_flor') {
            window.audio.play('flor');
            window.resetTimer();
            game.envidoCantado = true;
            procesarCantoFlorRed(d);
        } else if (d.tipo === 'respuesta_flor') {
            if (d.aceptada) window.audio.play('flor');
            procesarRespuestaFlorRed(d);
        } else if (d.tipo === 'repartir' && miRol === 'creador') {
            game.iniciarRonda();
            sincronizarEstadoMotor({ timerStartTime: Date.now() });
        }
    }
    else if (t === 'chat') {
        logJugada(`💬 Rival: ${d.msg}`, 'rival');
        window.audio.play('win-baza'); 
    }
    else if (t === 'abandonar_sala' || t === 'jugador_desconectado' || t === 'ganar_por_abandono') {
        detenerHeartbeat();
        const msg = t === 'abandonar_sala' ? "El oponente ha abandonado la partida." : (t === 'ganar_por_abandono' ? "Has ganado porque el rival no respondió a tiempo." : "El oponente se ha desconectado.");
        await window.UI.alert(`${msg} 🏆 ¡Victoria por abandono!`, "Fin de Partida");
        location.reload(); 
    }
    else if (t === 'pedir_revancha') {
        if (window.esperandoRespuestaRevancha) {
            // Choque positivo: Ambos pidieron revancha al mismo tiempo
            window.esperandoRespuestaRevancha = false;
            enviarAccionFirebase('respuesta_revancha', { aceptada: true });
            reiniciarPartidoLocal();
            return;
        }

        const aceptar = await window.UI.confirm("El oponente quiere una revancha.<br>¿Aceptás el desafío?");
        if (aceptar) {
            enviarAccionFirebase('respuesta_revancha', { aceptada: true });
            reiniciarPartidoLocal();
        } else {
            enviarAccionFirebase('respuesta_revancha', { aceptada: false });
        }
    }
    else if (t === 'respuesta_revancha') {
        window.esperandoRespuestaRevancha = false;
        if (d.aceptada) {
            await window.UI.alert("¡Revancha aceptada! Preparando el mazo...");
            reiniciarPartidoLocal();
        } else {
            await window.UI.alert("El rival no aceptó la revancha.");
        }
    }
}

// Helpers para modularizar el proceso de red
async function procesarCantoEnvidoRed(d) {
    if (game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).tieneFlor) {
        await window.UI.alert("🌐 Rival cantó Envido, pero tú tienes ¡FLOR!<br>(Se anula el Envido y cobras 3 pts)", "Salto de Flor");
        enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'tengo_flor' });
        if (miRol === 'creador') {
            game.puntosPartido.jugador += 3;
            game.fase = 'truco';
            sincronizarEstadoMotor();
        }
    } else {
        const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
        const accionOpt = await window.UI.options(`Rival: ¡Envido!<br>Tus puntos: ${misPtos}`, [
            { label: "QUIERO", value: "1", success: true, primary: true },
            { label: "NO QUIERO", value: "2", neutral: true },
            { label: "Real Envido", value: "4" },
            { label: "Falta Envido", value: "5", danger: true }
        ]);
        
        if (accionOpt === '1') {
            enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'quiero', susPtos: misPtos, apuestaFinal: 2 });
            resolverEnvidoRed(misPtos, d.pts, 2);
        } else if (accionOpt === '2') {
            enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'no_quiero', ptsRival: 1 });
            if (miRol === 'creador') { game.puntosPartido.oponente += 1; game.fase = 'truco'; sincronizarEstadoMotor(); }
        } else {
            // Envío subida...
            let nuevaApue = accionOpt === '4' ? 5 : 30; // Simplificado para red
            enviarAccionFirebase('canto_subida', { tipo: 'envido', canto: accionOpt === '4' ? 'Real Envido' : 'Falta Envido', apuestaTotal: nuevaApue, misPtos: misPtos, apuestaPrevia: 2 });
        }
    }
    renderJuego();
}

async function resolverEnvidoRed(mis, sus, premio) {
    const yoGano = mis > sus || (mis === sus && game.manoDelPartido === 'jugador');
    if (miRol === 'creador') {
        if (yoGano) game.puntosPartido.jugador += premio;
        else game.puntosPartido.oponente += premio;
        game.fase = 'truco';
        sincronizarEstadoMotor();
    } else {
        game.fase = 'truco'; // Sincronización local para el invitado
    }
    desbloquearSyncLocal();
    await window.UI.alert(yoGano ? `¡Ganaste el Envido! (${mis} vs ${sus})` : `Perdiste el Envido (${mis} vs ${sus})`);
    setTimeout(() => { if (window.UI.modal.style.display === 'block') window.UI._hide(); }, 3000);
    renderJuego();
}

function detenerHeartbeat() {
    if (window.heartbeatInterval) {
        clearInterval(window.heartbeatInterval);
        window.heartbeatInterval = null;
    }
    if (window.rivalPresenceSubscription) {
        const rivalPresenceRef = db.ref(`salas/${codigoSalaActual}/presence/${miRol === 'creador' ? 'invitado' : 'creador'}`);
        rivalPresenceRef.off('value', window.rivalPresenceSubscription);
        window.rivalPresenceSubscription = null;
    }
    const reconnectingOverlay = document.getElementById('overlay-reconnecting');
    if (reconnectingOverlay) reconnectingOverlay.style.display = 'none';
}

function reiniciarPartidoLocal() {
    game.puntosPartido.jugador = 0;
    game.puntosPartido.oponente = 0;
    game.partidoIniciado = false;
    if (miRol === 'creador') {
        game.iniciarRonda();
        sincronizarEstadoMotor();
    }
    renderJuego();
    document.getElementById('btn-repartir').style.display = 'none';
}

window.finalizarSalaFirebase = function() {
    if (modoJuego !== 'multiplayer' || !codigoSalaActual) return;
    
    detenerHeartbeat();
    if (miRol === 'creador') {
        db.ref('salas/' + codigoSalaActual).update({ estado: 'finalizado' });
    }
    
    // Mostrar controles de post-partida
    const btnRevancha = document.createElement('button');
    btnRevancha.className = 'btn-primary';
    btnRevancha.style.background = 'var(--gold)';
    btnRevancha.style.color = 'black';
    btnRevancha.innerText = "🔄 Pedir Revancha";
    btnRevancha.onclick = () => {
        window.esperandoRespuestaRevancha = true;
        enviarAccionFirebase('pedir_revancha');
        btnRevancha.disabled = true;
        btnRevancha.innerText = "Esperando al rival...";
    };

    const btnLobby = document.createElement('button');
    btnLobby.className = 'btn-primary';
    btnLobby.style.background = '#c0392b';
    btnLobby.innerText = "🚪 Salir al Lobby";
    btnLobby.onclick = () => {
        borrarSesionLocal();
        location.reload();
    };

    const feed = document.getElementById('game-feed');
    if (feed) {
        const div = document.createElement('div');
        div.style.padding = '20px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '10px';
        div.appendChild(btnRevancha);
        div.appendChild(btnLobby);
        feed.prepend(div);
    }
};

function mostrarLobbyEspera(codigo, isPublica) {
    const lobby = document.getElementById('lobby-espera') || crearElementoLobby();
    lobby.style.display = 'flex';
    document.getElementById('lobby-codigo').innerText = codigo;
    document.getElementById('lobby-tipo').innerText = isPublica ? "Buscando oponente público..." : "Esperando a tu amigo...";
}

function quitarLobbyEspera() {
    const lobby = document.getElementById('lobby-espera');
    if (lobby) lobby.style.display = 'none';
}

function crearElementoLobby() {
    const div = document.createElement('div');
    div.id = 'lobby-espera';
    div.className = 'glass';
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.zIndex = '10005';
    div.style.textAlign = 'center';
    div.style.flexDirection = 'column';
    div.style.gap = '20px';
    div.style.minWidth = '300px';

    div.innerHTML = `
        <h2 id="lobby-tipo">Esperando Rival</h2>
        <div style="font-size: 3rem; font-weight: bold; color: var(--gold); letter-spacing: 5px;" id="lobby-codigo">---</div>
        <p>Compartí este código con tu oponente para que se una.</p>
        <div class="loader"></div>
        <div style="display:flex; gap:10px; justify-content:center;">
            <button class="btn-primary" style="background: var(--gold); color: black;" onclick="window.copyRoomLink()">Copiar Enlace Directo</button>
            <button class="btn-primary" style="background: #c0392b;" onclick="location.reload()">Cancelar Búsqueda</button>
        </div>
    `;
    document.body.appendChild(div);
    return div;
}

// Funciones placeholder que faltaban asignar o conectar bien
async function procesarCantoTrucoRed(d) {
    const quiero = await window.UI.confirm(`🌐 Rival: ¡${d.canto}!<br><br>¿Deseas aceptar?`);
    if (quiero) {
        if (miRol === 'creador') {
            game.apuestaTruco.valor = d.sigValor;
            game.apuestaTruco.estado = d.sigNivel;
            game.apuestaTruco.turnoCantar = 'jugador';
            sincronizarEstadoMotor();
        }
        enviarAccionFirebase('respuesta_canto', { tipo: 'truco', resp: 'quiero' });
        game.fase = 'truco';
    } else {
        if (miRol === 'creador') {
            game.puntosPartido.oponente += game.apuestaTruco.valor;
            game.rondaTerminada = true;
            sincronizarEstadoMotor();
        }
        game.rondaTerminada = true; // Forzar local para UI freeze fix
        enviarAccionFirebase('respuesta_canto', { tipo: 'truco', resp: 'no_quiero' });
        await window.manejarFinDeRondaUI();
    }
    renderJuego();
}

async function procesarCantoSubidaRed(d) {
    const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
    const lossPts = d.apuestaPrevia || 2;
    
    const accionOpt = await window.UI.options(
        `🌐 Rival: ¡${d.canto}!<br>Apuesta actual: ${d.apuestaTotal} pts.<br>Tus puntos: ${misPtos} pts.`,
        [
            { label: "QUIERO", value: "1", primary: true, success: true },
            { label: `SON BUENAS (Pierdes ${lossPts})`, value: "2", neutral: true }
        ],
        "Rival sube la Apuesta"
    );
    
    if (accionOpt === '1') {
        enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'quiero', susPtos: misPtos, apuestaFinal: d.apuestaTotal });
        resolverEnvidoRed(misPtos, d.misPtos || 0, d.apuestaTotal);
    } else {
        enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'no_quiero', ptsRival: lossPts });
        if (miRol === 'creador') {
            game.puntosPartido.oponente += lossPts;
            game.fase = 'truco';
            sincronizarEstadoMotor();
        }
    }
}

async function procesarRespuestaCantoRed(d) {
    if (d.tipo === 'envido') {
        if (d.resp === 'quiero') {
            const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
            resolverEnvidoRed(misPtos, d.susPtos, d.apuestaFinal);
        } else if (d.resp === 'no_quiero') {
            const pts = d.ptsRival || 1;
            await window.UI.alert(`🌐 El rival se achicó. (+${pts} pt para ti)`);
            setTimeout(() => { if (window.UI.modal.style.display === 'block') window.UI._hide(); }, 3000);
            if (miRol === 'creador') {
                game.puntosPartido.jugador += pts;
                game.fase = 'truco';
                sincronizarEstadoMotor();
            }
            desbloquearSyncLocal();
        } else if (d.resp === 'con_flor_me_achico') {
            await window.UI.alert("🌐 Rival: 'Con Flor me Achico'. Ganás 3 Pts.");
            if (miRol === 'creador') {
                game.puntosPartido.jugador += 3;
                sincronizarEstadoMotor();
            }
        } else if (d.resp === 'no_flor') {
            await window.UI.alert("🌐 Rival no tiene Flor. ¡Cobrás 3 Pts redonditos! 🌸");
            if (miRol === 'creador') {
                game.puntosPartido.jugador += 3;
                sincronizarEstadoMotor();
            }
        } else if (d.resp === 'quiero_contra_flor') {
            const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
            resolverFlorRed(misPtos, d.susPtos, true);
        } else if (d.resp === 'achico_contra_flor') {
            await window.UI.alert("🌐 Rival se achicó en la Contra Flor. ¡Cobrás 3 Pts! 🌸");
            if (miRol === 'creador') {
                game.puntosPartido.jugador += 3;
                sincronizarEstadoMotor();
            }
        }
    } else if (d.tipo === 'truco') {
        if (d.resp === 'quiero') {
            await window.UI.alert("🌐 Rival ACEPTÓ el Truco. ¡Seguimos!");
            setTimeout(() => { if (window.UI.modal.style.display === 'block') window.UI._hide(); }, 3000);
            if (miRol === 'creador') {
                if (game.apuestaTruco.estado === 'nada') {
                    game.apuestaTruco.valor = 2;
                    game.apuestaTruco.estado = 'truco';
                } else if (game.apuestaTruco.estado === 'truco') {
                    game.apuestaTruco.valor = 3;
                    game.apuestaTruco.estado = 'retruco';
                } else if (game.apuestaTruco.estado === 'retruco') {
                    game.apuestaTruco.valor = 4;
                    game.apuestaTruco.estado = 'vale4';
                }
                game.apuestaTruco.turnoCantar = 'oponente'; 
                sincronizarEstadoMotor();
            }
            desbloquearSyncLocal();
        } else {
            await window.UI.alert("🌐 Rival SE ACHICÓ en el Truco. Ronda para ti.");
            setTimeout(() => { if (window.UI.modal.style.display === 'block') window.UI._hide(); }, 3000);
            if (miRol === 'creador') {
                game.puntosPartido.jugador += game.apuestaTruco.valor;
                game.rondaTerminada = true;
                sincronizarEstadoMotor();
            }
            desbloquearSyncLocal();
            game.rondaTerminada = true; // Forzar local para UI freeze fix
            await window.manejarFinDeRondaUI();
        }
    }
    renderJuego();
}

async function procesarCantoFlorRed(d) {
    const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
    const tengoFlor = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).tieneFlor;
    
    if (tengoFlor) {
        const contraFlor = await window.UI.confirm(`🌐 Rival: ¡Flor!<br>Tú también tienes Flor.<br><br>¿Te le animás a gritarle CONTRA FLOR AL RESTO?`, "Choque de Flores por Red");
        if (contraFlor) {
            await window.UI.alert(`🗣️ Tú: ¡CONTRA FLOR AL RESTO, che!`);
            enviarAccionFirebase('accion', { tipo: 'respuesta_flor', resp: 'contra_flor_resto', misPtos: misPtos, rivalPtos: d.pts });
            // No resolvemos aquí, esperamos la respuesta del rival a la contra flor al resto
        } else {
            await window.UI.alert(`Nadie agitó. Cada uno cobra 3 pts.`);
            enviarAccionFirebase('accion', { tipo: 'respuesta_flor', resp: 'con_flor_me_achico' });
            if (miRol === 'creador') {
                game.puntosPartido.jugador += 3;
                game.puntosPartido.oponente += 3;
                game.fase = 'truco';
                sincronizarEstadoMotor();
            }
        }
    } else {
        await window.UI.alert("🌐 Rival cantó ¡Flor!<br>(No tienes flor, el rival cobra 3 pts limpitos).");
        enviarAccionFirebase('accion', { tipo: 'respuesta_flor', resp: 'no_flor' });
        if (miRol === 'creador') {
            game.puntosPartido.oponente += 3;
            game.fase = 'truco';
            sincronizarEstadoMotor();
        }
    }
    renderJuego();
}

async function procesarRespuestaFlorRed(d) {
    if (d.resp === 'no_flor') {
        await window.UI.alert("🌐 Rival: Son buenas, paguen la Flor.<br>(+3 pts para ti).");
        if (miRol === 'creador') {
            game.puntosPartido.jugador += 3;
            game.fase = 'truco';
            sincronizarEstadoMotor();
        }
    } else if (d.resp === 'con_flor_me_achico') {
        await window.UI.alert("🌐 Rival se achicó con su Flor. Nadie cantó contra.<br>(Ambos cobran 3 pts).");
        if (miRol === 'creador') {
            game.puntosPartido.jugador += 3;
            game.puntosPartido.oponente += 3;
            game.fase = 'truco';
            sincronizarEstadoMotor();
        }
    } else if (d.resp === 'contra_flor_resto') {
        const quiero = await window.UI.confirm(`🌐 Rival pica fuerte: ¡CONTRA FLOR AL RESTO! 🌸💀<br><br>¿Te le animás?`);
        if (quiero) {
            const premio = game.config.limitePuntos - Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
            const misPtos = game.calcularPuntosEnvidoFlor(game.manoInicialJugador || game.manoJugador).puntos;
            enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'quiero_contra_flor', susPtos: misPtos, premio: premio });
            resolverFlorRed(misPtos, d.misPtos, true); // d.misPtos es los puntos del rival que cantó
        } else {
            await window.UI.alert("Te achicaste de la Contra Flor. El rival se lleva 3 puntitos de tu Flor.");
            enviarAccionFirebase('respuesta_canto', { tipo: 'envido', resp: 'achico_contra_flor' });
            if (miRol === 'creador') {
                game.puntosPartido.oponente += 3;
                sincronizarEstadoMotor();
            }
        }
    }
    renderJuego();
}

async function resolverFlorRed(mis, sus, alResto) {
    let premio = 3;
    let lider = Math.max(game.puntosPartido.jugador, game.puntosPartido.oponente);
    if (alResto) premio = game.config.limitePuntos - lider;
    
    // Si yo tengo más, gano yo. Si empatamos, gana el Mano.
    const yoGano = mis > sus || (mis === sus && game.manoDelPartido === 'jugador');
    
    if (miRol === 'creador') {
        if (yoGano) game.puntosPartido.jugador += premio;
        else game.puntosPartido.oponente += premio;
        game.fase = 'truco';
        sincronizarEstadoMotor();
    } else {
        game.fase = 'truco';
    }
    desbloquearSyncLocal();
    await window.UI.alert(yoGano ? `¡Tu Flor destrozó la de él! (+${premio} pts)` : `Su Flor te partió al medio (+${premio} pts)`);
    setTimeout(() => { if (window.UI.modal.style.display === 'block') window.UI._hide(); }, 3000);
    renderJuego();
}

window.enviarChatRed = function(texto) {
    if (!texto) {
        texto = document.getElementById('input-chat').value;
        document.getElementById('input-chat').value = '';
    }
    if (!texto || !texto.trim()) return;
    
    enviarAccionFirebase('chat', { msg: texto });
    logJugada(`💬 Tú: ${texto}`, 'propio');
};

function mostrarEstadoRival(texto) {
    let el = document.getElementById('estado-rival');
    if (!el) {
        el = document.createElement('div');
        el.id = 'estado-rival';
        el.className = 'glass';
        el.style.position = 'absolute';
        el.style.top = '140px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.padding = '5px 15px';
        el.style.borderRadius = '20px';
        el.style.fontSize = '0.8rem';
        el.style.color = '#aaa';
        el.style.zIndex = '100';
        el.style.border = '1px solid rgba(255,255,255,0.1)';
        document.querySelector('.table').appendChild(el);
    }
    el.innerText = texto;
    el.style.display = 'block';
}

function removerEstadoRival() {
    const el = document.getElementById('estado-rival');
    if (el) el.style.display = 'none';
}

/**
 * Restaura la sesión si existe una activa en localStorage
 */
window.checkExistingSession = async function() {
    const savedCode = localStorage.getItem('truco_room_code');
    const savedRole = localStorage.getItem('truco_role');
    
    if (savedCode && savedRole) {
        console.log("Reconectando a sesión previa:", savedCode);
        codigoSalaActual = savedCode;
        miRol = savedRole;
        window.modoJuego = 'multiplayer';
        
        const roomRef = db.ref('salas/' + codigoSalaActual);
        roomRef.once('value', (snap) => {
            if (snap.exists() && snap.val().estado !== 'finalizado') {
                // Reconectar listeners
                if (miRol === 'creador') {
                    // Host reconecta
                    document.getElementById('pantalla-inicio').style.display = 'none';
                    document.getElementById('chat-container').style.display = 'block';
                    document.getElementById('btn-abandonar').style.display = 'block';
                    
                    roomRef.child('estado').on('value', (s) => {
                        if (s.val() === 'conectado') {
                            roomRef.onDisconnect().cancel();
                            roomRef.child('estado').onDisconnect().set('jugador_desconectado');
                            quitarLobbyEspera();
                        }
                    });
                    roomRef.child('acciones_in').on('child_added', procesarAccionRed);
                    attachTypingListener(codigoSalaActual, 'invitado');
                    iniciarHeartbeat(codigoSalaActual, 'creador', 'invitado');
                    renderJuego();
                } else {
                    // Invitado reconecta
                    document.getElementById('pantalla-inicio').style.display = 'none';
                    document.getElementById('chat-container').style.display = 'block';
                    document.getElementById('btn-abandonar').style.display = 'block';
                    
                    roomRef.child('estado_maestro').on('value', (s) => {
                        const data = s.val();
                        if (data) asignarEstadoDesdeRed(data);
                    });
                    roomRef.child('acciones_host').on('child_added', procesarAccionRed);
                    attachTypingListener(codigoSalaActual, 'creador');
                    iniciarHeartbeat(codigoSalaActual, 'invitado', 'creador');
                }
            } else {
                borrarSesionLocal();
            }
        });
    }
};

window.copyRoomLink = function() {
    const url = new URL(window.location.href);
    url.hash = codigoSalaActual;
    navigator.clipboard.writeText(url.toString()).then(() => {
        logJugada("📋 ¡Enlace copiado al portapapeles!", "sistema");
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.checkExistingSession();
    
    // Auto-unirse si hay hash en la URL
    const hash = window.location.hash.substring(1);
    if (hash && hash.length === 6 && !localStorage.getItem('truco_room_code')) {
        document.getElementById('input-sala').value = hash;
        setTimeout(() => {
            unirseSalaFirebase(hash);
        }, 500);
    }

    // Listener de Escritura (Typing)
    const chatInput = document.getElementById('input-chat');
    if (chatInput) {
        let typingTimeout = null;
        chatInput.addEventListener('input', () => {
            if (window.modoJuego === 'multiplayer' && codigoSalaActual) {
                db.ref(`salas/${codigoSalaActual}/typing_${miRol}`).set(true);
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    db.ref(`salas/${codigoSalaActual}/typing_${miRol}`).set(false);
                }, 2000);
            }
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.enviarChatRed();
                db.ref(`salas/${codigoSalaActual}/typing_${miRol}`).set(false);
            }
        });
    }
});

// Listener para el typing del rival
function attachTypingListener(roomCode, rivalRole) {
    db.ref(`salas/${roomCode}/typing_${rivalRole}`).on('value', (snap) => {
        const isTyping = snap.val();
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = isTyping ? 'block' : 'none';
        }
    });
}

window.heartbeatInterval = null;
window.rivalPresenceSubscription = null;
window.modalAbandonoMostrado = false;

function iniciarHeartbeat(roomCode, myRole, rivalRole) {
    const presenceRef = db.ref(`salas/${roomCode}/presence/${myRole}`);
    const rivalPresenceRef = db.ref(`salas/${roomCode}/presence/${rivalRole}`);
    
    // Limpiar previo
    detenerHeartbeat();
    window.modalAbandonoMostrado = false;

    document.getElementById('ping-container').style.display = 'flex';
    
    window.heartbeatInterval = setInterval(() => {
        presenceRef.set(firebase.database.ServerValue.TIMESTAMP);
    }, 2000); // 2 segundos para detección rápida
    
    window.rivalPresenceSubscription = rivalPresenceRef.on('value', (snap) => {
        const lastSeen = snap.val();
        if (!lastSeen) return;
        
        // Uso de ServerValue.TIMESTAMP implica que necesitamos calcular la diferencia
        // Pero Firebase nos da el timestamp del servidor. Para evitar clock skew:
        db.ref(".info/serverTimeOffset").once("value", (offsetSnap) => {
            const offset = offsetSnap.val() || 0;
            const now = Date.now() + offset;
            const diff = now - lastSeen;
            
            const reconnectingOverlay = document.getElementById('overlay-reconnecting');
            if (reconnectingOverlay) {
                if (diff > 8000) {
                    reconnectingOverlay.style.display = 'flex';
                    reconnectingOverlay.style.zIndex = '300000'; // Asegurar que esté por encima de todo
                } else {
                    reconnectingOverlay.style.display = 'none';
                    window.modalAbandonoMostrado = false; // Resetear si vuelve
                }
            }

            // Lógica de Abandono con Confirmación
            if (diff > 45000 && !window.modalAbandonoMostrado && window.modoJuego === 'multiplayer') {
                window.modalAbandonoMostrado = true;
                window.UI.confirm(
                    "El rival lleva más de 45 segundos sin responder. ¿Deseas dar el partido por ganado por abandono o esperar un poco más?",
                    "⚠️ Posible Abandono"
                ).then(quiereGanar => {
                    if (quiereGanar) {
                        logJugada("🏆 Reclamando victoria por abandono...", "sistema");
                        enviarAccionFirebase('ganar_por_abandono');
                        // El host procesará esto y cerrará la sala
                    }
                });
            }

            const dot = document.getElementById('ping-dot');
            const text = document.getElementById('ping-text');
            if (text) text.innerText = `${Math.max(0, diff)}ms`;
            if (dot) {
                if (diff < 500) dot.style.background = '#2ecc71';
                else if (diff < 2000) dot.style.background = '#f1c40f';
                else dot.style.background = '#e74c3c';
            }
        });
    });
}

