/**
 * SoundManager para el Truco Uruguayo.
 * Gestiona la reproducción de efectos de sonido y voces de forma segura.
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        
        const soundUrls = {
            'card-play': 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
            'card-deal': 'https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3',
            'win-baza': 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
            'loss': 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
            
            // Voces Reales (Neural TTS - Uruguay)
            'truco': 'assets/audio_voices/truco.mp3',
            'retruco': 'assets/audio_voices/retruco.mp3',
            'vale_4': 'assets/audio_voices/vale_4.mp3',
            'envido': 'assets/audio_voices/envido.mp3',
            'real_envido': 'assets/audio_voices/real_envido.mp3',
            'falta_envido': 'assets/audio_voices/falta_envido.mp3',
            'flor': 'assets/audio_voices/flor.mp3',
            'contra_flor': 'assets/audio_voices/contra_flor.mp3',
            'contra_flor_al_resto': 'assets/audio_voices/contra_flor_al_resto.mp3',
            'con_flor_me_achico': 'assets/audio_voices/con_flor_me_achico.mp3',
            'quiero': 'assets/audio_voices/quiero.mp3',
            'no_quiero': 'assets/audio_voices/no_quiero.mp3',
            'son_buenas': 'assets/audio_voices/son_buenas.mp3',
            'mazo': 'assets/audio_voices/me_voy_al_mazo.mp3'
        };

        if (typeof Audio !== 'undefined') {
            for (let name in soundUrls) {
                try {
                    const audio = new Audio(soundUrls[name]);
                    audio.volume = 0.5;
                    this.sounds[name] = audio;
                } catch(e) {}
            }
        }
    }

    play(name) {
        if (this.muted) return;
        try {
            if (this.sounds && this.sounds[name]) {
                const s = this.sounds[name];
                s.currentTime = 0;
                const p = s.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(() => {});
                }
            } else {
                this.reproduceVoz(name);
            }
        } catch(e) {}
    }

    reproduceVoz(texto) {
        try {
            if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = 'es-AR';
                utterance.rate = 1.2;
                utterance.pitch = 0.8;
                window.speechSynthesis.speak(utterance);
            }
        } catch(e) {}
    }
}

if (typeof window !== 'undefined') {
    window.SoundManager = SoundManager;
    window.audio = new SoundManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}
