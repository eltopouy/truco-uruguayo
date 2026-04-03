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
        if (typeof game === 'undefined' || !game.muestra || !game.partidoIniciado) return '';

        const muestra = game.muestra;
        const PALS_SVG_LOCAL = typeof PALS_SVG !== 'undefined' ? PALS_SVG : {};
        const svg = PALS_SVG_LOCAL[muestra.palo] || '';
        const valor = muestra.valor === 10 ? 'SOTA' : muestra.valor === 11 ? 'CAB' : muestra.valor === 12 ? 'REY' : muestra.valor;

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
            <!-- Carta Muestra miniatura -->
            <div style="
                width: 52px; height: 78px;
                background: white;
                border-radius: 6px;
                border: 2px solid ${color};
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 3px;
                box-sizing: border-box;
                flex-shrink: 0;
                box-shadow: 0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px var(--gold);
                position: relative;
            ">
                <span style="font-size:0.9rem; font-weight:900; color:${color}; align-self:flex-start; line-height:1;">${valor}</span>
                <div style="width:32px; height:32px;">${svg}</div>
                <span style="font-size:0.9rem; font-weight:900; color:${color}; align-self:flex-end; transform:rotate(180deg); line-height:1;">${valor}</span>
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
        this.overlay.style.display = 'block';
        document.body.classList.add('modal-active');
    },

    _hide: function() {
        this.modal.style.display = 'none';
        this.overlay.style.display = 'none';
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
