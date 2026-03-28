/**
 * SoundManager para el Truco Uruguayo.
 * Gestiona la reproducción de efectos de sonido y voces con fallback rioplatense.
 */

class SoundManager {
    constructor() {
        this.sounds = {
            'card-play': new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'),
            'card-deal': new Audio('https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3'),
            'win-baza': new Audio('https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3'),
            'loss': new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'),
            'envido': new Audio('https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3'),
            'truco': null, 
            'flor': null,
            'quiero': null,
            'no-quiero': null,
            'mazo': null
        };

        this.muted = false;
        this.initVolume();
    }

    initVolume() {
        Object.values(this.sounds).forEach(s => {
            if (s) s.volume = 0.4;
        });
    }

    play(name) {
        if (this.muted) return;
        const s = this.sounds[name];
        if (s && s.play) {
            s.currentTime = 0;
            s.play().catch(e => {
                console.warn(`Audio [${name}] falló o está bloqueado:`, e);
                if (['truco', 'envido', 'flor', 'quiero', 'no-quiero'].includes(name)) {
                    this.gritarFallback(name);
                }
            });
        } else {
            // Si es un "grito" y no hay archivo, usamos síntesis
            this.gritarFallback(name);
        }
    }

    gritarFallback(voz) {
        if (!('speechSynthesis' in window)) return;
        
        // Limpiamos el texto (ej: "no-quiero" -> "No quiero")
        const frase = voz.replace('-', ' ').toUpperCase();
        const utterance = new SpeechSynthesisUtterance(frase);
        
        // Configuración para que suene más "rioplatense"
        utterance.lang = 'es-AR'; 
        utterance.pitch = 0.7; // Voz más gruesa, de boliche
        utterance.rate = 1.1;  // Más rápido/enérgico
        utterance.volume = 0.8;

        // Intentar encontrar una voz masculina si es posible
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.includes('es-AR') || v.lang.includes('es-ES'));
        if (preferred) utterance.voice = preferred;

        window.speechSynthesis.speak(utterance);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

const sounds = new SoundManager();
window.audio = sounds;
 // Exponer globalmente
