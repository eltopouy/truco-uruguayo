// js/uiManager.js
window.UI = {
    init: function() {
        this.modal = document.getElementById('modal-custom');
        this.overlay = document.getElementById('overlay-custom');
        this.title = document.getElementById('modal-title');
        this.message = document.getElementById('modal-message');
        this.buttonsContainer = document.getElementById('modal-buttons');
    },

    _show: function(title, msg) {
        if (!this.modal) this.init();
        this.title.innerText = title;
        this.message.innerHTML = msg.replace(/\n/g, '<br>');
        this.buttonsContainer.innerHTML = '';
        this.modal.style.display = 'block';
        this.overlay.style.display = 'block';
    },

    _hide: function() {
        this.modal.style.display = 'none';
        this.overlay.style.display = 'none';
    },

    alert: function(msg, title = "Atención") {
        return new Promise((resolve) => {
            this._show(title, msg);
            
            // Auto descartar alerta luego de 10 segundos
            const timeoutHandler = setTimeout(() => {
                if (this.modal.style.display === 'block' && this.title.innerText === title) {
                    this._hide();
                    resolve();
                }
            }, 10000);

            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.innerText = 'Entendido';
            btn.onclick = () => {
                clearTimeout(timeoutHandler);
                this._hide();
                resolve();
            };
            this.buttonsContainer.appendChild(btn);
        });
    },

    confirm: function(msg, title = "Decisión") {
        return new Promise((resolve) => {
            this._show(title, msg);
            
            // Timeout preventivo antibloqueo (25 segundos)
            const timeoutHandler = setTimeout(() => {
                if (this.modal.style.display === 'block' && this.title.innerText === title) {
                    this._hide();
                    resolve(false); // Automáticamente "Cancela/No Quiero"
                }
            }, 25000);
            
            const btnYes = document.createElement('button');
            btnYes.className = 'btn-action btn-truco';
            btnYes.innerText = 'Aceptar / Quiero';
            
            const btnNo = document.createElement('button');
            btnNo.className = 'btn-action';
            btnNo.style.background = 'linear-gradient(135deg, #7f8c8d, #34495e)';
            btnNo.style.boxShadow = '0 4px 0 #1a252f';
            btnNo.innerText = 'Cancelar / No Quiero';

            btnYes.onclick = () => {
                clearTimeout(timeoutHandler);
                this._hide();
                resolve(true);
            };
            btnNo.onclick = () => {
                clearTimeout(timeoutHandler);
                this._hide();
                resolve(false);
            };

            this.buttonsContainer.appendChild(btnYes);
            this.buttonsContainer.appendChild(btnNo);
        });
    },

    options: function(msg, optionsList, title = "Opciones") {
        return new Promise((resolve) => {
            this._show(title, msg);
            
            // Timeout preventivo (25 segundos)
            const timeoutHandler = setTimeout(() => {
                if (this.modal.style.display === 'block' && this.title.innerText === title) {
                    this._hide();
                    const safeOpt = optionsList.find(o => o.neutral || o.danger) || optionsList[optionsList.length - 1];
                    resolve(safeOpt.value);
                }
            }, 25000);

            optionsList.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = opt.primary ? 'btn-action btn-truco' : 'btn-action';
                
                if (opt.neutral) {
                    btn.style.background = 'linear-gradient(135deg, #7f8c8d, #34495e)';
                    btn.style.boxShadow = '0 4px 0 #1a252f';
                }
                if (opt.danger) {
                    btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                    btn.style.boxShadow = '0 4px 0 #922b21';
                }
                if (opt.success) {
                    btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                    btn.style.boxShadow = '0 4px 0 #1e8449';
                }

                btn.innerText = opt.label;
                btn.onclick = () => {
                    clearTimeout(timeoutHandler);
                    this._hide();
                    resolve(opt.value);
                };
                this.buttonsContainer.appendChild(btn);
            });
        });
    },

    /**
     * Renderizado Premium del Estado del Juego
     * Centraliza todas las actualizaciones del DOM para evitar redundancia en app.js
     */
    renderGameState: function(game) {
        if (!game) return;

        // 1. Actualizar Marcador
        const scoreJugador = document.getElementById('mini-score-yo');
        const scoreOponente = document.getElementById('mini-score-rival');
        if(scoreJugador) scoreJugador.innerText = game.puntosPartido.jugador;
        if(scoreOponente) scoreOponente.innerText = game.puntosPartido.oponente;
        
        // Etiquetas Malas/Buenas
        const labelJugador = document.getElementById('label-malas-buenas-jugador');
        const labelOponente = document.getElementById('label-malas-buenas-oponente');
        if(labelJugador) labelJugador.innerText = game.puntosPartido.jugador < 15 ? 'MALAS' : 'BUENAS';
        if(labelOponente) labelOponente.innerText = game.puntosPartido.oponente < 15 ? 'MALAS' : 'BUENAS';

        // 2. Actualizar Bazas
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

        // 3. Actualizar Ayudante de Puntos
        const envidoPts = document.getElementById('envido-pts');
        const florPts = document.getElementById('flor-pts');
        if(envidoPts) envidoPts.innerText = game.puntosEnvidoJugador || 0;
        if(florPts) florPts.innerText = game.tieneFlorJugador ? 'SÍ' : 'No';

        // 4. Panel de Acciones (Visualización dinámica)
        const actionsPanel = document.getElementById('actions-panel');
        if (actionsPanel) {
            const isMyTurn = (game.turno === 'jugador' && !game.rondaTerminada && game.partidoIniciado);
            actionsPanel.style.opacity = isMyTurn ? '1' : '0.5';
            actionsPanel.style.pointerEvents = isMyTurn ? 'auto' : 'none';
            
            // Botón Flor
            const btnFlor = document.getElementById('btn-flor');
            if(btnFlor) btnFlor.style.display = game.tieneFlorJugador && !game.envidoCantado ? 'block' : 'none';
        }

        // 5. Botón Repartir
        const btnRepartir = document.getElementById('btn-repartir');
        if(btnRepartir) {
            btnRepartir.style.display = (game.rondaTerminada && !game.partidoFinalizado && game.partidoIniciado) ? 'block' : 'none';
        }
    },

    /**
     * Crea el elemento DOM para una carta con diseño Premium
     */
    crearCartaDOM: function(carta, esMuestra = false, oculta = false, callback = null) {
        const cardDiv = document.createElement('div');
        cardDiv.className = esMuestra ? 'card card-muestra' : 'card animate-deal';
        
        if (oculta) {
            cardDiv.classList.add('card-facedown');
            return cardDiv;
        }

        // Diseño Premium con SVG y Pintas Españolas
        const paloClass = 'palo-' + carta.palo.toLowerCase();
        const tienePinta = ['Copa', 'Espada', 'Basto'].includes(carta.palo);
        const pintaClass = tienePinta ? 'pinta-' + carta.palo.toLowerCase() : '';

        cardDiv.innerHTML = `
            <div class="card-inner-frame ${pintaClass}"></div>
            <div class="card-content ${paloClass}">
                <div class="card-value-top">${carta.valor}</div>
                <div class="card-suit-main">
                    ${window.PALS_SVG[carta.palo] || ''}
                    ${carta.valor >= 10 ? `<span class="figura-text">${this._getFiguraName(carta.valor)}</span>` : ''}
                </div>
                <div class="card-value-bot">${carta.valor}</div>
            </div>
        `;

        if (carta.esPieza) {
            cardDiv.classList.add('pieza-glowing');
            const label = document.createElement('span');
            label.className = 'pieza-label';
            label.innerText = carta.piezaNombre || 'PIEZA';
            cardDiv.appendChild(label);
        }

        if (callback) cardDiv.onclick = callback;
        return cardDiv;
    },

    _getFiguraName: function(v) {
        if (v === 10) return 'Sota';
        if (v === 11) return 'Caballo';
        if (v === 12) return 'Rey';
        return '';
    },

    /**
     * Notificación efímera (Toast) para eventos del juego
     */
    toast: function(msg, type = 'sistema') {
        const feed = document.getElementById('game-feed');
        if (!feed) return;

        const div = document.createElement('div');
        div.className = 'feed-msg ' + type;
        div.innerHTML = msg;
        feed.prepend(div);

        // Auto-eliminar después de 6 segundos para no saturar el HUD
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(-20px)';
            setTimeout(() => div.remove(), 500);
        }, 6000);
    }
};
