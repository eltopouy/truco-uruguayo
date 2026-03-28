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
