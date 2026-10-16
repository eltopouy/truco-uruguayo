/**
 * ============================================================================
 * 🃏 TRUCO URUGUAYO ONLINE - CHAT, REACTIONS & WEBRTC VOICE MANAGER
 * ============================================================================
 * Gestiona el cajón de chat en vivo, reacciones rápidas criollas, burbujas
 * flotantes en la mesa, respuestas de IA en modo solitario y llamadas de voz
 * P2P mediante WebRTC señalizado por Firebase Realtime Database.
 */

window.ChatManager = (function () {
    'use strict';

    let isOpen = false;
    let unreadCount = 0;
    let isOnlineRoom = false;
    let currentRoomCode = null;
    let messages = [];
    let processedMsgIds = new Set();
    let lastSentTimestamp = 0;
    const COOLDOWN_MS = 900; // Anti-spam: máx 1 mensaje cada 0.9s
    const MAX_MESSAGES = 60;

    // Estado de indicador "Escribiendo..."
    let typingTimeout = null;
    let remoteTypingTimeout = null;
    let isLocalTyping = false;

    // =========================================================================
    // ESTADO WEBRTC (CHAT DE VOZ EN TIEMPO REAL)
    // =========================================================================
    let inVoiceCall = false;
    let isMuted = false;
    let isDeafened = false;
    let localStream = null;
    let peerConnection = null;
    let voiceParticipants = {};
    let vadAudioCtx = null;
    let vadInterval = null;
    let isCurrentlySpeaking = false;
    let remoteIceCandidatesQueue = [];

    const RTC_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    // Referencias DOM
    let els = {};

    // Respuestas criollas del Bot para modo solitario (1v1 y 2v2)
    const BOT_REPLIES_1V1 = [
        '¡Jajaja, no te achiques ahora, bo! 😎',
        '¡Con esa cara no asustás a nadie! 🃏',
        '¡Vamo\' arriba que esto recién empieza! 🇺🇾',
        'Mmm... me parece que estásCargando sin nada 🤔',
        '¡Jugá rápido que se enfría el mate! 🧉',
        '¡Qué ligue tenés hoy, impresionante! 🍀',
        '¡Ojo que tengo el Macho guardado! ⚔️',
        '¡A mí no me corrés con la vaina vacía! 🔥'
    ];

    const BOT_REPLIES_2V2 = [
        { autor: 'Compañero', texto: '¡Vamo\' nosotros compañero, pasame seña! 😉' },
        { autor: 'Rival 1', texto: '¡Están pasando señas truchas ahí! 👀' },
        { autor: 'Rival 2', texto: '¡A la cucha los dos! 🐕' },
        { autor: 'Compañero', texto: '¡Tranquilo que yo te cubro esta mano! 🛡️' },
        { autor: 'Rival 1', texto: '¡Qué tarro tienen hoy, bo! 🍀' }
    ];

    /**
     * Inicializa los elementos del DOM y eventos del chat y voz
     */
    function init() {
        els = {
            toggleBtn: document.getElementById('btn-chat-toggle'),
            floatingBtn: document.getElementById('floating-chat-btn'),
            unreadBadge: document.getElementById('chat-unread-badge'),
            voiceActiveBadge: document.getElementById('voice-active-indicator'),
            statusDot: document.getElementById('chat-status-dot'),
            topStatusDot: document.getElementById('top-chat-status-dot'),
            drawer: document.getElementById('chat-drawer'),
            closeBtn: document.getElementById('btn-chat-close'),
            roomBadge: document.getElementById('chat-room-badge'),
            messagesContainer: document.getElementById('chat-messages-container'),
            emptyState: document.getElementById('chat-empty-state'),
            reactionsBar: document.getElementById('chat-quick-reactions'),
            form: document.getElementById('chat-input-form'),
            input: document.getElementById('chat-text-input'),
            floatingBubbles: document.getElementById('floating-speech-bubbles-container'),
            // Elementos de Voz WebRTC
            voiceBar: document.getElementById('voice-call-bar'),
            voiceJoinBtn: document.getElementById('btn-voice-join'),
            voiceActiveControls: document.getElementById('voice-active-controls'),
            voiceMuteBtn: document.getElementById('btn-voice-mute'),
            voiceDeafenBtn: document.getElementById('btn-voice-deafen'),
            voiceHangupBtn: document.getElementById('btn-voice-hangup'),
            voiceStatusLabel: document.getElementById('voice-status-label'),
            voiceUsersList: document.getElementById('voice-users-list'),
            remoteAudio: document.getElementById('webrtc-remote-audio')
        };

        if (!els.drawer) return;

        // Abrir / cerrar cajón desde la barra superior o el botón flotante
        if (els.toggleBtn) {
            els.toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDrawer();
            });
        }

        if (els.floatingBtn) {
            els.floatingBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDrawer();
            });
        }

        if (els.closeBtn) {
            els.closeBtn.addEventListener('click', () => {
                closeDrawer();
            });
        }

        // Cerrar al hacer clic fuera del cajón (excepto en botones del chat)
        document.addEventListener('click', (e) => {
            if (!isOpen || !els.drawer) return;
            const clickedInsideDrawer = els.drawer.contains(e.target);
            const clickedToggle = (els.toggleBtn && els.toggleBtn.contains(e.target)) ||
                                  (els.floatingBtn && els.floatingBtn.contains(e.target));
            if (!clickedInsideDrawer && !clickedToggle) {
                closeDrawer();
            }
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeDrawer();
            }
        });

        // Envío de formulario de texto
        if (els.form) {
            els.form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!els.input) return;
                const text = els.input.value.trim();
                if (!text) return;

                if (enviarMensaje(text, 'texto')) {
                    els.input.value = '';
                    notificarTypingLocal(false);
                }
            });
        }

        // Detectar escritura para mostrar "Escribiendo..." al rival
        if (els.input) {
            els.input.addEventListener('input', () => {
                const hasText = els.input.value.trim().length > 0;
                if (hasText) {
                    notificarTypingLocal(true);
                    if (typingTimeout) clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        notificarTypingLocal(false);
                    }, 2500);
                } else {
                    notificarTypingLocal(false);
                }
            });
        }

        // Botones de reacciones rápidas
        if (els.reactionsBar) {
            const btns = els.reactionsBar.querySelectorAll('.quick-reaction-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const msg = btn.getAttribute('data-msg');
                    if (msg) {
                        enviarMensaje(msg, 'reaccion');
                    }
                });
            });
        }

        // Eventos de Llamada de Voz WebRTC
        if (els.voiceJoinBtn) {
            els.voiceJoinBtn.addEventListener('click', () => {
                iniciarLlamadaVoz();
            });
        }
        if (els.voiceMuteBtn) {
            els.voiceMuteBtn.addEventListener('click', () => {
                toggleMuteVoz();
            });
        }
        if (els.voiceDeafenBtn) {
            els.voiceDeafenBtn.addEventListener('click', () => {
                toggleDeafenVoz();
            });
        }
        if (els.voiceHangupBtn) {
            els.voiceHangupBtn.addEventListener('click', () => {
                colgarLlamadaVoz();
            });
        }

        // Limpiar presencia de voz si el usuario cierra la pestaña
        window.addEventListener('beforeunload', () => {
            if (inVoiceCall) {
                colgarLlamadaVoz(true);
            }
        });

        // Asegurar que el cajón inicie cerrado y oculto (incluso si hay caché de CSS)
        els.drawer.classList.add('hidden');
        els.drawer.style.display = 'none';
        if (els.floatingBtn && els.floatingBtn.classList.contains('hidden')) {
            els.floatingBtn.style.display = 'none';
        }

        actualizarPuntoEstado();
    }

    /**
     * Actualiza el punto indicador de estado (3 colores) en el botón flotante y barra superior:
     * - Rojo (.dot-rojo): Llamada de voz activa o otro jugador conectado en voz
     * - Amarillo (.dot-amarillo): Mensajes nuevos sin leer
     * - Verde (.dot-verde): Listo para interactuar (estado normal)
     */
    function actualizarPuntoEstado() {
        const remoteInVoice = Object.keys(voiceParticipants || {}).length > 0;
        const voiceActive = inVoiceCall || remoteInVoice;

        let dotClass = 'dot-verde';
        if (voiceActive) {
            dotClass = 'dot-rojo';
        } else if (unreadCount > 0 && !isOpen) {
            dotClass = 'dot-amarillo';
        }

        if (els.statusDot) {
            els.statusDot.classList.remove('dot-verde', 'dot-amarillo', 'dot-rojo');
            els.statusDot.classList.add(dotClass);
        }

        if (els.topStatusDot) {
            els.topStatusDot.classList.remove('dot-verde', 'dot-amarillo', 'dot-rojo');
            els.topStatusDot.classList.add(dotClass);
        }
    }

    /**
     * Habilita o deshabilita el chat según el modo de juego
     * @param {boolean} enabled - Si debe mostrarse el botón de chat
     * @param {string|null} roomCode - Código de sala online (o null si es práctica local contra IA)
     */
    function habilitarChat(enabled, roomCode = null) {
        if (!els.drawer) init();

        // Si cambiamos de sala o salimos, colgar llamada activa
        if (inVoiceCall && (!enabled || roomCode !== currentRoomCode)) {
            colgarLlamadaVoz(true);
        }

        const isChangingContext = (roomCode !== currentRoomCode) || (Boolean(roomCode) !== isOnlineRoom);
        isOnlineRoom = Boolean(roomCode);
        currentRoomCode = roomCode;

        if (els.toggleBtn) {
            if (enabled) {
                els.toggleBtn.classList.remove('hidden');
                els.toggleBtn.style.display = 'inline-flex';
            } else {
                els.toggleBtn.classList.add('hidden');
                els.toggleBtn.style.display = 'none';
                closeDrawer();
            }
        }

        if (els.floatingBtn) {
            if (enabled) {
                els.floatingBtn.classList.remove('hidden');
                els.floatingBtn.style.display = '';
            } else {
                els.floatingBtn.classList.add('hidden');
                els.floatingBtn.style.display = 'none';
            }
        }

        if (els.roomBadge) {
            els.roomBadge.textContent = roomCode ? `SALA ${roomCode}` : 'MESA LOCAL (VS IA)';
        }

        // Si cambia la sala o se inicia nueva sesión, limpiar historial previo
        if (!enabled || isChangingContext) {
            limpiarHistorial();
        }

        // Suscribirse a Firebase si estamos en sala online
        if (enabled && isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            window.FirebaseManager.escucharChat((msgData) => {
                recibirMensajeRemoto(msgData);
            });
            if (typeof window.FirebaseManager.escucharTyping === 'function') {
                window.FirebaseManager.escucharTyping((typingData) => {
                    mostrarIndicadorTypingRemoto(typingData);
                });
            }
            configurarListenersVozFirebase();
        }

        actualizarPuntoEstado();
    }

    /**
     * Abre o cierra el cajón lateral de chat
     */
    function toggleDrawer() {
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    function openDrawer() {
        if (!els.drawer) return;
        isOpen = true;
        els.drawer.classList.remove('hidden');
        els.drawer.style.display = 'flex';
        if (els.toggleBtn) els.toggleBtn.classList.add('chat-open');
        if (els.floatingBtn) els.floatingBtn.classList.add('chat-open');
        resetUnread();

        setTimeout(() => {
            scrollToBottom();
            if (els.input && window.innerWidth > 640) {
                els.input.focus();
            }
        }, 80);
    }

    function closeDrawer() {
        if (!els.drawer) return;
        isOpen = false;
        els.drawer.classList.add('hidden');
        els.drawer.style.display = 'none';
        if (els.toggleBtn) els.toggleBtn.classList.remove('chat-open');
        if (els.floatingBtn) els.floatingBtn.classList.remove('chat-open');
        actualizarPuntoEstado();
    }

    /**
     * Limpia el historial de mensajes del DOM y memoria
     */
    function limpiarHistorial() {
        messages = [];
        processedMsgIds.clear();
        voiceParticipants = {};
        resetUnread();

        if (els.messagesContainer) {
            const items = els.messagesContainer.querySelectorAll('.chat-msg-bubble, .chat-system-notice, .chat-typing-indicator');
            items.forEach(el => el.remove());
        }
        if (els.emptyState) {
            els.emptyState.classList.remove('hidden');
            els.emptyState.style.display = 'flex';
        }
        actualizarUIVoz();
        actualizarPuntoEstado();
    }

    /**
     * Notifica a Firebase si el jugador local está escribiendo
     */
    function notificarTypingLocal(typing) {
        if (isLocalTyping === typing) return;
        isLocalTyping = typing;
        if (isOnlineRoom && window.FirebaseManager && typeof window.FirebaseManager.enviarEstadoTyping === 'function') {
            window.FirebaseManager.enviarEstadoTyping(typing, obtenerNombreLocal());
        }
    }

    /**
     * Muestra u oculta el indicador de "Rival está escribiendo..."
     */
    function mostrarIndicadorTypingRemoto(typingData) {
        if (!els.messagesContainer) return;
        let indicator = document.getElementById('chat-remote-typing');

        const isRemoteTyping = typingData && typingData.typing && typingData.timestamp && (Date.now() - typingData.timestamp < 6000);

        if (!isRemoteTyping) {
            if (indicator) indicator.remove();
            return;
        }

        const autor = sanitizarTexto(typingData.autor || 'Rival');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'chat-remote-typing';
            indicator.className = 'chat-typing-indicator';
            els.messagesContainer.appendChild(indicator);
        }
        indicator.textContent = `✍️ ${autor} está escribiendo...`;
        scrollToBottom();

        if (remoteTypingTimeout) clearTimeout(remoteTypingTimeout);
        remoteTypingTimeout = setTimeout(() => {
            const el = document.getElementById('chat-remote-typing');
            if (el) el.remove();
        }, 4000);
    }

    /**
     * Obtiene el nombre del jugador local
     */
    function obtenerNombreLocal() {
        try {
            const saved = localStorage.getItem('truco_player_name');
            if (saved && saved.trim()) return saved.trim().substring(0, 18);
        } catch (e) { /* ignore */ }
        if (window.game && window.game.players && window.game.players[0]) {
            return window.game.players[0].name || 'Vos';
        }
        return 'Vos';
    }

    /**
     * Sanitiza texto plano para prevenir inyecciones o desbordes
     */
    function sanitizarTexto(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 120);
    }

    /**
     * Reproduce un sonido sutil al enviar o recibir un mensaje de chat
     */
    function reproducirSonidoChat() {
        try {
            if (window.SoundManager && typeof window.SoundManager.play === 'function') {
                window.SoundManager.play('chat-message');
            }
        } catch (e) { /* ignore */ }
    }

    /**
     * Envía un mensaje o reacción
     * @param {string} rawText - Contenido del mensaje
     * @param {string} tipo - 'texto' | 'reaccion'
     * @returns {boolean} true si se envió correctamente
     */
    function enviarMensaje(rawText, tipo = 'texto') {
        const now = Date.now();
        if (now - lastSentTimestamp < COOLDOWN_MS) {
            return false; // Anti-spam
        }

        const cleanText = sanitizarTexto(rawText);
        if (!cleanText) return false;

        lastSentTimestamp = now;

        const miAsiento = (window.FirebaseManager && window.FirebaseManager.isAvailable() && isOnlineRoom)
            ? window.FirebaseManager.getMiSeat()
            : 0;

        const msgObj = {
            id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
            autor: obtenerNombreLocal(),
            asiento: miAsiento,
            rol: typeof window.miRol === 'string' && window.miRol ? window.miRol : 'local',
            texto: cleanText,
            tipo: tipo === 'reaccion' ? 'reaccion' : 'texto',
            timestamp: now
        };

        // Registrar localmente de inmediato para respuesta instantánea (Optimistic UI)
        processedMsgIds.add(msgObj.id);
        renderizarMensaje(msgObj, true);
        mostrarBurbujaFlotante(msgObj, true);
        reproducirSonidoChat();

        // Sincronizar también con el log de mesa tradicional (#game-feed) si existe
        if (typeof window.agregarLogChat === 'function') {
            window.agregarLogChat(msgObj.autor, msgObj.texto, true);
        }

        // Publicar en Firebase si es sala online (sin bloquear la mesa ni alterar secuencias de juego)
        if (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            window.FirebaseManager.enviarMensajeChat(msgObj);
        } else {
            // Modo solitario (vs IA): simular respuesta simpática del Bot
            simularRespuestaBot(msgObj);
        }

        return true;
    }

    /**
     * Recibe un mensaje entrante desde Firebase o desde el Bot
     */
    function recibirMensajeRemoto(msgData) {
        if (!msgData || !msgData.id || !msgData.texto) return;

        // Evitar duplicados (incluyendo nuestros propios mensajes ya renderizados)
        if (processedMsgIds.has(msgData.id)) return;
        processedMsgIds.add(msgData.id);

        // Ignorar mensajes demasiado antiguos (> 10 minutos) al entrar a una sala
        if (msgData.timestamp && (Date.now() - msgData.timestamp > 10 * 60 * 1000)) {
            return;
        }

        const miAsiento = (window.FirebaseManager && window.FirebaseManager.isAvailable() && isOnlineRoom)
            ? window.FirebaseManager.getMiSeat()
            : 0;
        const miRolActual = (window.FirebaseManager && typeof window.FirebaseManager.getMiRol === 'function')
            ? window.FirebaseManager.getMiRol()
            : window.miRol;

        const esMio = (msgData.rol && miRolActual && msgData.rol === miRolActual) ||
                      (!msgData.rol && msgData.asiento === miAsiento && msgData.autor === obtenerNombreLocal());

        // Si el rival envió el mensaje, ocultar su indicador de "escribiendo..."
        if (!esMio) {
            const typingEl = document.getElementById('chat-remote-typing');
            if (typingEl) typingEl.remove();
        }

        renderizarMensaje(msgData, esMio);
        mostrarBurbujaFlotante(msgData, esMio);

        if (!esMio) {
            reproducirSonidoChat();
            if (typeof window.agregarLogChat === 'function') {
                window.agregarLogChat(msgData.autor || 'Rival', msgData.texto, false);
            }
            if (!isOpen) {
                incrementarUnread();
            }
        }
    }

    /**
     * Simula una respuesta ocasional de los Bots cuando se juega en modo solitario
     */
    function simularRespuestaBot(playerMsg) {
        if (isOnlineRoom) return;
        // Responder ~65% de las veces para que sea natural
        if (Math.random() > 0.65) return;

        const is4P = window.game && window.game.numPlayers === 4;
        let autorBot = 'Computadora';
        let textoBot = BOT_REPLIES_1V1[Math.floor(Math.random() * BOT_REPLIES_1V1.length)];

        if (is4P) {
            const pick = BOT_REPLIES_2V2[Math.floor(Math.random() * BOT_REPLIES_2V2.length)];
            autorBot = pick.autor;
            textoBot = pick.texto;
        } else if (playerMsg.texto.includes('Buena jugada') || playerMsg.texto.includes('👏')) {
            textoBot = '¡Gracias bo, se hace lo que se puede! 🎩';
        } else if (playerMsg.texto.includes('No tenés nada') || playerMsg.texto.includes('🤏')) {
            textoBot = '¡Cantame Truco si te animás entonces! 🔥';
        } else if (playerMsg.texto.includes('suerte') || playerMsg.texto.includes('🍀')) {
            textoBot = '¡Suerte las ganas, esto es pura muñeca! 😉';
        }

        setTimeout(() => {
            if (isOnlineRoom) return;
            mostrarIndicadorTypingRemoto({ typing: true, autor: autorBot, timestamp: Date.now() });
        }, 500);

        const delay = 1400 + Math.floor(Math.random() * 1000);
        setTimeout(() => {
            if (isOnlineRoom) return; // Si el usuario entró a una sala online mientras tanto, cancelar
            mostrarIndicadorTypingRemoto({ typing: false });
            const botMsg = {
                id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                autor: autorBot,
                asiento: 1,
                rol: 'bot',
                texto: textoBot,
                tipo: 'texto',
                timestamp: Date.now()
            };
            recibirMensajeRemoto(botMsg);
        }, delay);
    }

    /**
     * Renderiza una burbuja de mensaje dentro del cajón de chat
     */
    function renderizarMensaje(msg, esMio) {
        if (!els.messagesContainer) return;

        if (els.emptyState) {
            els.emptyState.classList.add('hidden');
            els.emptyState.style.display = 'none';
        }

        messages.push(msg);

        // Mantener límite de mensajes en DOM
        if (messages.length > MAX_MESSAGES) {
            messages.shift();
            const firstBubble = els.messagesContainer.querySelector('.chat-msg-bubble');
            if (firstBubble) firstBubble.remove();
        }

        const bubble = document.createElement('div');
        const classes = ['chat-msg-bubble', esMio ? 'msg-own' : 'msg-remote'];
        if (msg.tipo === 'reaccion') {
            classes.push('msg-reaction');
        }
        bubble.className = classes.join(' ');

        const meta = document.createElement('div');
        meta.className = 'chat-msg-meta';

        const authorSpan = document.createElement('span');
        authorSpan.className = 'chat-msg-author';
        authorSpan.textContent = esMio ? 'Vos' : sanitizarTexto(msg.autor || 'Rival');

        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-msg-time';
        const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
        timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        meta.appendChild(authorSpan);
        meta.appendChild(timeSpan);

        const textDiv = document.createElement('div');
        textDiv.className = 'chat-msg-text';
        textDiv.textContent = sanitizarTexto(msg.texto);

        bubble.appendChild(meta);
        bubble.appendChild(textDiv);

        // Insertar antes del indicador de typing si existe
        const typingEl = document.getElementById('chat-remote-typing');
        if (typingEl && typingEl.parentNode === els.messagesContainer) {
            els.messagesContainer.insertBefore(bubble, typingEl);
        } else {
            els.messagesContainer.appendChild(bubble);
        }

        scrollToBottom();
    }

    /**
     * Muestra un aviso de sistema en el chat (ej: llamada de voz iniciada)
     */
    function agregarAvisoSistema(texto) {
        if (!els.messagesContainer) return;
        if (els.emptyState) {
            els.emptyState.classList.add('hidden');
            els.emptyState.style.display = 'none';
        }

        const notice = document.createElement('div');
        notice.className = 'chat-system-notice';
        notice.textContent = texto;
        els.messagesContainer.appendChild(notice);
        scrollToBottom();
    }

    /**
     * Muestra una burbuja de diálogo rápida sobre la mesa cuando llega un mensaje
     * (especialmente útil cuando el cajón de chat está cerrado)
     */
    function mostrarBurbujaFlotante(msg, esMio) {
        if (!els.floatingBubbles) return;
        // Si el cajón ya está abierto y el mensaje es nuestro, no hace falta tapar la pantalla
        if (isOpen && esMio) return;

        const pop = document.createElement('div');
        pop.className = `speech-bubble-pop ${esMio ? 'own-pop' : 'remote-pop'}`;

        const authorStrong = document.createElement('span');
        authorStrong.className = 'pop-author';
        authorStrong.textContent = esMio ? 'Vos:' : `${sanitizarTexto(msg.autor || 'Rival')}:`;

        const contentSpan = document.createElement('span');
        contentSpan.textContent = sanitizarTexto(msg.texto);

        pop.appendChild(authorStrong);
        pop.appendChild(contentSpan);

        els.floatingBubbles.appendChild(pop);

        // Máximo 3 burbujas flotantes simultáneas
        while (els.floatingBubbles.children.length > 3) {
            els.floatingBubbles.firstElementChild.remove();
        }

        setTimeout(() => {
            if (pop.parentNode) {
                pop.remove();
            }
        }, 3800);
    }

    function incrementarUnread() {
        unreadCount++;
        if (els.unreadBadge) {
            els.unreadBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
            els.unreadBadge.classList.remove('hidden');
            els.unreadBadge.style.display = 'flex';
        }
        actualizarPuntoEstado();
    }

    function resetUnread() {
        unreadCount = 0;
        if (els.unreadBadge) {
            els.unreadBadge.textContent = '0';
            els.unreadBadge.classList.add('hidden');
            els.unreadBadge.style.display = 'none';
        }
        actualizarPuntoEstado();
    }

    function scrollToBottom() {
        if (els.messagesContainer) {
            els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
        }
    }

    // =========================================================================
    // SISTEMA DE CHAT DE VOZ WEBRTC (P2P + FIREBASE SIGNALING)
    // =========================================================================

    function configurarListenersVozFirebase() {
        if (!window.FirebaseManager || !window.FirebaseManager.isAvailable()) return;

        // 1. Escuchar lista de participantes en el canal de voz
        window.FirebaseManager.escucharParticipantesVoz((participantes) => {
            voiceParticipants = participantes || {};
            actualizarUIVoz();
            actualizarPuntoEstado();

            // Si estamos en llamada de voz y hay otro participante, verificar si debemos iniciar la oferta WebRTC
            if (inVoiceCall) {
                verificarConexionWebRTC();
            }
        });

        // 2. Escuchar ofertas SDP entrantes
        window.FirebaseManager.escucharOfertaVoz(async (offerData) => {
            if (!inVoiceCall || !offerData) return;
            const miAsiento = window.FirebaseManager.getMiSeat();
            if (offerData.from === miAsiento) return;

            try {
                await manejarOfertaRemota(offerData);
            } catch (e) {
                console.warn('⚠️ Error al procesar oferta de voz WebRTC:', e);
            }
        });

        // 3. Escuchar respuestas SDP entrantes
        window.FirebaseManager.escucharRespuestaVoz(async (answerData) => {
            if (!inVoiceCall || !answerData || !peerConnection) return;
            const miAsiento = window.FirebaseManager.getMiSeat();
            if (answerData.from === miAsiento) return;

            try {
                if (peerConnection.signalingState === 'have-local-offer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription({
                        type: answerData.type,
                        sdp: answerData.sdp
                    }));
                    await procesarColaCandidatosIce();
                }
            } catch (e) {
                console.warn('⚠️ Error al procesar respuesta de voz WebRTC:', e);
            }
        });

        // 4. Escuchar candidatos ICE del par remoto
        window.FirebaseManager.escucharCandidatosIceVoz(async (candidateData) => {
            if (!inVoiceCall || !candidateData) return;
            try {
                const candidate = new RTCIceCandidate(candidateData);
                if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                    await peerConnection.addIceCandidate(candidate);
                } else {
                    remoteIceCandidatesQueue.push(candidate);
                }
            } catch (e) {
                console.warn('⚠️ Error al agregar candidato ICE:', e);
            }
        });
    }

    /**
     * Inicia o se une al canal de voz de la sala
     */
    async function iniciarLlamadaVoz() {
        if (inVoiceCall) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            agregarAvisoSistema('⚠️ Tu navegador no permite acceso al micrófono en este contexto.');
            return;
        }

        if (els.voiceStatusLabel) {
            els.voiceStatusLabel.textContent = 'Solicitando micrófono...';
        }

        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (err) {
            console.warn('⚠️ No se pudo acceder al micrófono:', err);
            if (els.voiceStatusLabel) {
                els.voiceStatusLabel.textContent = 'Permiso de micrófono denegado';
            }
            agregarAvisoSistema('🎙️ Permiso de micrófono denegado. Revisá los permisos del navegador.');
            return;
        }

        inVoiceCall = true;
        isMuted = false;
        isDeafened = false;

        iniciarDetectorActividadVoz(localStream);

        const miNombre = obtenerNombreLocal();

        if (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            const miAsiento = window.FirebaseManager.getMiSeat();
            voiceParticipants[`seat_${miAsiento}`] = {
                nombre: miNombre,
                asiento: miAsiento,
                muted: false,
                speaking: false
            };
            window.FirebaseManager.registrarParticipanteVoz(miNombre, false);
            agregarAvisoSistema('🔊 Te conectaste al canal de voz de la sala.');
            verificarConexionWebRTC();
        } else {
            // Modo local de prueba
            voiceParticipants = {
                seat_0: { nombre: miNombre, asiento: 0, muted: false, speaking: false }
            };
            agregarAvisoSistema('🎙️ Micrófono activo (Modo práctica local). ¡Unite a una sala online para hablar con tus amigos!');
        }

        actualizarUIVoz();
        actualizarPuntoEstado();
    }

    /**
     * Cuelga y desconecta del canal de voz
     */
    function colgarLlamadaVoz(silent = false) {
        inVoiceCall = false;
        isMuted = false;
        isDeafened = false;
        isCurrentlySpeaking = false;
        remoteIceCandidatesQueue = [];

        detenerDetectorActividadVoz();

        if (peerConnection) {
            try {
                peerConnection.onicecandidate = null;
                peerConnection.ontrack = null;
                peerConnection.onconnectionstatechange = null;
                peerConnection.close();
            } catch (e) { /* ignore */ }
            peerConnection = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) { /* ignore */ }
            });
            localStream = null;
        }

        if (els.remoteAudio) {
            els.remoteAudio.srcObject = null;
        }

        if (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            window.FirebaseManager.removerParticipanteVoz();
            window.FirebaseManager.limpiarSenalesVoz();
        } else {
            voiceParticipants = {};
        }

        if (!silent) {
            agregarAvisoSistema('📴 Te desconectaste del canal de voz.');
        }

        actualizarUIVoz();
        actualizarPuntoEstado();
    }

    /**
     * Silencia o activa el micrófono propio
     */
    function toggleMuteVoz() {
        if (!inVoiceCall || !localStream) return;
        isMuted = !isMuted;

        localStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });

        const miAsiento = (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable())
            ? window.FirebaseManager.getMiSeat()
            : 0;

        if (voiceParticipants[`seat_${miAsiento}`]) {
            voiceParticipants[`seat_${miAsiento}`].muted = isMuted;
            if (isMuted) voiceParticipants[`seat_${miAsiento}`].speaking = false;
        }

        if (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            window.FirebaseManager.registrarParticipanteVoz(obtenerNombreLocal(), isMuted);
        }

        actualizarUIVoz();
    }

    /**
     * Silencia o activa el audio entrante del rival (Deafen)
     */
    function toggleDeafenVoz() {
        if (!inVoiceCall) return;
        isDeafened = !isDeafened;

        if (els.remoteAudio) {
            els.remoteAudio.muted = isDeafened;
        }

        actualizarUIVoz();
    }

    /**
     * Crea y configura la instancia RTCPeerConnection
     */
    function crearPeerConnection() {
        if (peerConnection) {
            try { peerConnection.close(); } catch (e) { /* ignore */ }
        }

        peerConnection = new RTCPeerConnection(RTC_CONFIG);
        remoteIceCandidatesQueue = [];

        // Agregar pistas de nuestro micrófono
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Enviar candidatos ICE locales por Firebase
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
                window.FirebaseManager.enviarCandidatoIceVoz(event.candidate);
            }
        };

        // Recibir audio remoto del rival
        peerConnection.ontrack = (event) => {
            if (els.remoteAudio && event.streams && event.streams[0]) {
                els.remoteAudio.srcObject = event.streams[0];
                els.remoteAudio.muted = isDeafened;
                els.remoteAudio.play().catch(err => {
                    console.warn('⚠️ Autoplay de audio remoto requiere interacción:', err);
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            if (!peerConnection) return;
            const state = peerConnection.connectionState;
            if (state === 'connected') {
                actualizarUIVoz('Conectado en vivo 🔊');
            } else if (state === 'disconnected' || state === 'failed') {
                actualizarUIVoz('Reconectando audio...');
            }
        };

        return peerConnection;
    }

    /**
     * Verifica si hay otro participante en el canal de voz y negocia la llamada.
     * Convención libre de colisiones: el asiento 0 (Anfitrión) crea la oferta SDP.
     */
    async function verificarConexionWebRTC() {
        if (!inVoiceCall || !isOnlineRoom || !window.FirebaseManager || !window.FirebaseManager.isAvailable()) return;

        const seatsInVoice = Object.keys(voiceParticipants);
        if (seatsInVoice.length < 2) {
            // Todavía estamos solos en el canal de voz
            return;
        }

        const miAsiento = window.FirebaseManager.getMiSeat();
        // El asiento menor (normalmente 0) actúa como iniciador de la oferta WebRTC
        if (miAsiento === 0) {
            if (peerConnection && (peerConnection.connectionState === 'connected' || peerConnection.connectionState === 'connecting')) {
                return;
            }
            try {
                const pc = crearPeerConnection();
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                window.FirebaseManager.enviarOfertaVoz(offer);
            } catch (e) {
                console.warn('⚠️ Error al crear oferta WebRTC:', e);
            }
        }
    }

    /**
     * Procesa una oferta SDP entrante (ejecutado por el invitado / asiento != 0)
     */
    async function manejarOfertaRemota(offerData) {
        const pc = crearPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: offerData.type,
            sdp: offerData.sdp
        }));
        await procesarColaCandidatosIce();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        window.FirebaseManager.enviarRespuestaVoz(answer);
    }

    async function procesarColaCandidatosIce() {
        if (!peerConnection || !peerConnection.remoteDescription) return;
        while (remoteIceCandidatesQueue.length > 0) {
            const candidate = remoteIceCandidatesQueue.shift();
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (e) {
                console.warn('⚠️ Error procesando cola ICE:', e);
            }
        }
    }

    /**
     * Detector de Actividad de Voz (VAD) mediante Web Audio API
     * Ilumina el avatar del jugador cuando habla por el micrófono.
     */
    function iniciarDetectorActividadVoz(stream) {
        detenerDetectorActividadVoz();
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            vadAudioCtx = new AudioCtx();
            const source = vadAudioCtx.createMediaStreamSource(stream);
            const analyser = vadAudioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            vadInterval = setInterval(() => {
                if (!inVoiceCall || isMuted) {
                    actualizarEstadoHablandoLocal(false);
                    return;
                }
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const speakingNow = average > 18; // Umbral de voz activa
                actualizarEstadoHablandoLocal(speakingNow);
            }, 220);
        } catch (e) {
            // Ignorar si Web Audio API no está disponible
        }
    }

    function detenerDetectorActividadVoz() {
        if (vadInterval) {
            clearInterval(vadInterval);
            vadInterval = null;
        }
        if (vadAudioCtx) {
            try { vadAudioCtx.close(); } catch (e) { /* ignore */ }
            vadAudioCtx = null;
        }
    }

    function actualizarEstadoHablandoLocal(speaking) {
        if (isCurrentlySpeaking === speaking) return;
        isCurrentlySpeaking = speaking;

        const miAsiento = (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable())
            ? window.FirebaseManager.getMiSeat()
            : 0;

        if (voiceParticipants[`seat_${miAsiento}`]) {
            voiceParticipants[`seat_${miAsiento}`].speaking = speaking;
        }

        if (isOnlineRoom && window.FirebaseManager && window.FirebaseManager.isAvailable()) {
            window.FirebaseManager.actualizarEstadoHablandoVoz(speaking);
        }

        renderizarChipsParticipantesVoz();
    }

    /**
     * Actualiza toda la interfaz de la barra de voz y botones
     */
    function actualizarUIVoz(customStatusText = null) {
        if (!els.voiceBar) return;

        const participantKeys = Object.keys(voiceParticipants || {});
        const numInVoice = participantKeys.length;

        // Indicador verde pulsante en el botón de la barra superior cuando la voz está activa
        if (els.voiceActiveBadge) {
            if (inVoiceCall || numInVoice > 0) {
                els.voiceActiveBadge.classList.remove('hidden');
                els.voiceActiveBadge.style.display = 'inline-block';
            } else {
                els.voiceActiveBadge.classList.add('hidden');
                els.voiceActiveBadge.style.display = 'none';
            }
        }

        if (inVoiceCall) {
            els.voiceBar.classList.add('in-call');
            if (els.voiceJoinBtn) {
                els.voiceJoinBtn.classList.add('hidden');
                els.voiceJoinBtn.style.display = 'none';
            }
            if (els.voiceActiveControls) {
                els.voiceActiveControls.classList.remove('hidden');
                els.voiceActiveControls.style.display = 'flex';
            }

            if (els.voiceMuteBtn) {
                els.voiceMuteBtn.textContent = isMuted ? '🔇' : '🎙️';
                els.voiceMuteBtn.classList.toggle('is-muted', isMuted);
                els.voiceMuteBtn.title = isMuted ? 'Activar micrófono' : 'Silenciar micrófono';
            }

            if (els.voiceDeafenBtn) {
                els.voiceDeafenBtn.textContent = isDeafened ? '🔈' : '🔊';
                els.voiceDeafenBtn.classList.toggle('is-deafened', isDeafened);
                els.voiceDeafenBtn.title = isDeafened ? 'Activar audio entrante' : 'Silenciar audio entrante';
            }

            if (els.voiceStatusLabel) {
                if (customStatusText) {
                    els.voiceStatusLabel.textContent = customStatusText;
                } else if (!isOnlineRoom) {
                    els.voiceStatusLabel.textContent = isMuted ? 'Micrófono silenciado' : 'Voz activa (Local)';
                } else if (numInVoice > 1) {
                    els.voiceStatusLabel.textContent = isMuted ? 'En llamada (Silenciado)' : 'En llamada de voz 🔊';
                } else {
                    els.voiceStatusLabel.textContent = 'Esperando al rival en voz...';
                }
            }
        } else {
            els.voiceBar.classList.remove('in-call');
            if (els.voiceJoinBtn) {
                els.voiceJoinBtn.classList.remove('hidden');
                els.voiceJoinBtn.style.display = 'flex';
                const textEl = els.voiceJoinBtn.querySelector('.voice-btn-text');
                if (textEl) {
                    textEl.textContent = numInVoice > 0 ? 'Unirse a la llamada' : 'Conectar Voz';
                }
            }
            if (els.voiceActiveControls) {
                els.voiceActiveControls.classList.add('hidden');
                els.voiceActiveControls.style.display = 'none';
            }

            if (els.voiceStatusLabel) {
                if (numInVoice > 0) {
                    els.voiceStatusLabel.textContent = `🎙️ ${numInVoice} jugador(es) en el canal de voz`;
                } else {
                    els.voiceStatusLabel.textContent = 'Canal de voz disponible';
                }
            }
        }

        renderizarChipsParticipantesVoz();
        actualizarPuntoEstado();
    }

    function renderizarChipsParticipantesVoz() {
        if (!els.voiceUsersList) return;
        const participantKeys = Object.keys(voiceParticipants || {});

        if (participantKeys.length === 0) {
            els.voiceUsersList.classList.add('hidden');
            els.voiceUsersList.style.display = 'none';
            els.voiceUsersList.innerHTML = '';
            return;
        }

        els.voiceUsersList.classList.remove('hidden');
        els.voiceUsersList.style.display = 'flex';
        els.voiceUsersList.innerHTML = '';

        participantKeys.forEach(key => {
            const p = voiceParticipants[key];
            if (!p) return;

            const chip = document.createElement('div');
            const chipClasses = ['voice-user-chip'];
            if (p.speaking && !p.muted) chipClasses.push('is-speaking');
            if (p.muted) chipClasses.push('is-muted');
            chip.className = chipClasses.join(' ');

            const dot = document.createElement('span');
            dot.className = 'voice-speaking-dot';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${sanitizarTexto(p.nombre || 'Jugador')} ${p.muted ? '🔇' : ''}`;

            chip.appendChild(dot);
            chip.appendChild(nameSpan);
            els.voiceUsersList.appendChild(chip);
        });
    }

    // Inicializar automáticamente cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init,
        habilitarChat,
        enviarMensaje,
        recibirMensajeRemoto,
        limpiarHistorial,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        iniciarLlamadaVoz,
        colgarLlamadaVoz,
        toggleMuteVoz,
        toggleDeafenVoz,
         getUnreadCount: () => unreadCount,
        isOpen: () => isOpen
    };
})();
