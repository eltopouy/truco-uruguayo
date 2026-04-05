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
            
            // Voces Reales (Neural TTS - Uruguay)
            'truco': new Audio('assets/audio_voices/truco.mp3'),
            'retruco': new Audio('assets/audio_voices/retruco.mp3'),
            'vale_4': new Audio('assets/audio_voices/vale_4.mp3'),
            'envido': new Audio('assets/audio_voices/envido.mp3'),
            'real_envido': new Audio('assets/audio_voices/real_envido.mp3'),
            'falta_envido': new Audio('assets/audio_voices/falta_envido.mp3'),
            'flor': new Audio('assets/audio_voices/flor.mp3'),
            'contra_flor': new Audio('assets/audio_voices/contra_flor.mp3'),
            'contra_flor_al_resto': new Audio('assets/audio_voices/contra_flor_al_resto.mp3'),
            'con_flor_me_achico': new Audio('assets/audio_voices/con_flor_me_achico.mp3'),
            'quiero': new Audio('assets/audio_voices/quiero.mp3'),
            'no_quiero': new Audio('assets/audio_voices/no_quiero.mp3'),
            'son_buenas': new Audio('assets/audio_voices/son_buenas.mp3'),
            'mazo': new Audio('assets/audio_voices/me_voy_al_mazo.mp3')
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
