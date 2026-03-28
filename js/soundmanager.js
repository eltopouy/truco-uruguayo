/**
 * SoundManager para el Truco Uruguayo.
 * Gestiona la reproducción de efectos de sonido y voces.
 */

class SoundManager {
    constructor() {
        this.sounds = {
            'card-play': new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'), // Click genérico
            'card-deal': new Audio('https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3'), // Deslizar
            'win-baza': new Audio('https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3'), // Campana suave
            'loss': new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'), // Error suave
            
            // Voces (Placeholders - El usuario puede reemplazarlos por archivos locales .mp3)
            'truco': null,
            'envido': null,
            'flor': null,
            'quiero': null,
            'no-quiero': null,
            'mazo': null
        };

        // Volumen por defecto y Estado
        this.muted = false;
        Object.values(this.sounds).forEach(s => {
            if (s) s.volume = 0.5;
        });
    }

    play(name) {
        if (this.muted) return;
        if (this.sounds[name]) {
            // Reiniciar si ya estaba sonando
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(e => console.warn("Audio play blocked by browser:", e));
        } else {
            // Si es una voz y no hay archivo, podríamos usar SpeechSynthesis como fallback divertido
            this.reproduceVoz(name);
        }
    }

    reproduceVoz(texto) {
        // Fallback: Síntesis de voz si no hay archivo de audio para el "grito"
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-AR'; // Acento rioplatense (lo más cercano a UY)
        utterance.rate = 1.2;
        utterance.pitch = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

const sounds = new SoundManager();
window.audio = sounds; // Exponer globalmente
