// js/uiManager.js
window.UI = {
    init: function() {
        this.modal = document.getElementById('modal-custom');
        this.overlay = document.getElementById('overlay-custom');
        this.title = document.getElementById('modal-title');
        this.message = document.getElementById('modal-message');
        this.buttonsContainer = document.getElementById('modal-buttons');
    },

    /**
     * Construye el HTML del widget de contexto de juego (muestra + envido + flor).
     * Se inyecta en cada modal para que el jugador pueda decidir con información.
     */
    _buildContextWidget: function() {
        // Solo mostrar si hay una partida activa
        // Solo mostrar si hay una partida activa
        if (typeof game === 'undefined' || !game.muestra || !game.partidoIniciado) return '';

        const muestra = game.muestra;
        const url = `assets/cards/${muestra.palo}_${muestra.valor}.png`;

        // Colores por palo
        const paloColors = { 'Oro': '#d35400', 'Copa': '#c0392b', 'Espada': '#2c3e50', 'Basto': '#27ae60' };
        const color = paloColors[muestra.palo] || '#333';

        // Puntos de envido del jugador
        let envidoInfo = '';
        if (typeof game.calcularPuntosEnvidoFlor === 'function') {
            const mano = game.manoInicialJugador && game.manoInicialJugador.length > 0 ? game.manoInicialJugador : game.manoJugador;
            const calc = game.calcularPuntosEnvidoFlor(mano);
            const florBadge = calc.tieneFlor
                ? `<span style="background:#27ae60; color:white; border-radius:4px; padding:1px 6px; font-size:0.75rem; font-weight:bold;">🌸 FLOR</span>`
                : '';
            envidoInfo = `
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="color:#aaa; font-size:0.8rem;">Tu Envido:</span>
                    <span style="color:var(--gold); font-weight:bold; font-size:1rem;">${calc.puntos} pts</span>
                    <span style="color:#888; font-size:0.75rem;">(${calc.tipo})</span>
                    ${florBadge}
                </div>`;
        }

        // Piezas activas de la ronda
        let piezasInfo = '';
        if (game.piezasActivas && game.piezasActivas.length > 0) {
            const nombresP = game.piezasActivas.map(v => {
                if (v === 2) return '2';
                if (v === 4) return '4';
                if (v === 5) return '5';
                if (v === 11) return 'CAB (Perico)';
                if (v === 10) return 'SOT (Perica)';
                if (v === 12) return 'REY (Alcahuete)';
                return v;
            });
            piezasInfo = `<span style="color:#888; font-size:0.75rem;">Piezas: ${nombresP.join(' > ')}</span>`;
        }

        return `
        <div id="modal-game-context" style="
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 10px 14px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 14px;
            text-align: left;
        ">
            <!-- Carta Muestra miniatura pixel art -->
            <div style="
                width: 48px; height: 68px; /* 100x155 scale approx */
                background-image: url('${url}');
                background-size: 100% 100%;
                background-position: center;
                border-radius: 4px;
                flex-shrink: 0;
                box-shadow: 0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px var(--gold);
                position: relative;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
            ">
                <div style="
                    position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
                    background:var(--gold); color:black; font-size:0.55rem; font-weight:900;
                    padding:1px 5px; border-radius:3px; white-space:nowrap; letter-spacing:0.5px;
                ">MUESTRA</div>
            </div>
            <!-- Info de la partida -->
            <div style="display:flex; flex-direction:column; gap:5px; min-width:0;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="color:#ccc; font-size:0.8rem;">Palo:</span>
                    <span style="color:${color}; font-weight:bold; font-size:0.9rem;">${muestra.palo}</span>
                </div>
                ${piezasInfo}
                ${envidoInfo}
            </div>
        </div>`;
    },

    _show: function(title, msg) {
        if (!this.modal) this.init();
        this.title.innerText = title;
        // Inyectar el widget de contexto ANTES del mensaje
        const contextHTML = this._buildContextWidget();
        this.message.innerHTML = contextHTML + msg.replace(/\n/g, '<br>');
        this.buttonsContainer.innerHTML = '';
        this.modal.style.display = 'block';
        this.modal.classList.remove('modal-animate-pop');
        void this.modal.offsetWidth; // trigger reflow
        this.modal.classList.add('modal-animate-pop');
        
        // Si es una decisión de juego, lo hacemos más sutil y sin oscurecer (overlay transparente)
        const isGameDecision = !title.includes("Cagazo") && !title.includes("Revancha") && !title.includes("Atención") && !title.includes("Fin de");
        if (isGameDecision) {
            this.overlay.style.background = 'transparent';
            this.overlay.style.backdropFilter = 'none';
            this.title.style.display = 'none';
            
            // Separar el mensaje: la primera línea es el titular visible, el resto va a "Ver Info"
            const rawText = msg.replace(/<br\s*\/?>/gi, '\n');
            const lines = rawText.split('\n').filter(l => l.trim() !== '');
            const headline = lines[0] || '';
            const details = lines.slice(1).join('<br>');
            const hasDetails = details.trim() !== '' || contextHTML.trim() !== '';
            
            this.message.innerHTML = `
                <div style="text-align:center; font-size:1.15rem; font-weight:bold; color:#fff; margin-bottom:6px; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">
                    ${headline}
                </div>
                ${hasDetails ? `
                <div style="text-align: center; margin-bottom: 4px;">
                    <button id="btn-info-extra" style="background:transparent; border:1px solid rgba(255,255,255,0.25); color:#bbb; border-radius:15px; padding:2px 10px; font-size:0.7rem; cursor:pointer;" onclick="var el=document.getElementById('info-text-extra'); el.style.display = el.style.display==='none'?'block':'none';">ℹ️ Ver Info</button>
                </div>
                <div id="info-text-extra" style="display:none; font-size: 0.85rem; margin-bottom: 6px; opacity:0.75; text-align:center;">
                    ${contextHTML}${details}
                </div>` : ''}
            `;
            
            this.message.style.marginBottom = '5px';
            this.modal.style.border = 'none';
            this.modal.style.background = 'rgba(15, 15, 15, 0.5)';
            this.modal.style.backdropFilter = 'blur(6px)';
            this.modal.style.boxShadow = '0 5px 15px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.3)';
            this.buttonsContainer.style.flexDirection = 'row';
            this.buttonsContainer.style.flexWrap = 'wrap';
            this.buttonsContainer.style.justifyContent = 'center';
            this.modal.style.top = '65%';
            this.modal.style.padding = '10px 14px';
        } else {
            this.message.innerHTML = contextHTML + msg.replace(/\n/g, '<br>');
            this.overlay.style.background = 'rgba(0,0,0,0.8)';
            this.overlay.style.backdropFilter = 'blur(8px)';
            this.title.style.display = 'block';
            this.message.style.marginBottom = '20px';
            this.message.style.fontSize = '1.1rem';
            this.modal.style.border = '1px solid var(--gold)';
            this.modal.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            this.buttonsContainer.style.flexDirection = 'column';
            this.modal.style.top = '50%';
            this.modal.style.padding = '25px';
        }

        this.overlay.style.display = 'block';
        document.body.classList.add('modal-active');
    },

    _hide: function() {
        this.modal.style.display = 'none';
        this.overlay.style.display = 'none';
        this.modal.classList.remove('modal-animate-pop');
        
        // Restaurar estado default por si luego salta un modal estandar
        this.overlay.style.background = 'rgba(0,0,0,0.8)';
        this.overlay.style.backdropFilter = 'blur(8px)';
        this.title.style.display = 'block';
        this.buttonsContainer.style.flexDirection = 'column';

        document.body.classList.remove('modal-active');
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
    }
};

window.toggleSyncOverlay = function(show) {
    const overlay = document.getElementById('overlay-sync');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
};
