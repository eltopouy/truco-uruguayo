/**
 * SoundManager para el Truco Uruguayo.
 * Gestiona la reproducción de efectos de sonido, voces y síntesis de audio procedural Web Audio API.
 * Garantiza sonido 100% offline, baja latencia y compatibilidad móvil sin fallos.
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.audioCtx = null;

        // Recuperar preferencia de silencio si está guardada
        if (typeof localStorage !== 'undefined') {
            try {
                const storedMute = localStorage.getItem('truco_sound_muted');
                if (storedMute !== null) {
                    this.muted = storedMute === 'true';
                }
            } catch(e) {}
        }
        
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

    _getAudioContext() {
        if (!this.audioCtx && typeof window !== 'undefined') {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass) {
                try {
                    this.audioCtx = new AudioCtxClass();
                } catch(e) {}
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    unlock() {
        const ctx = this._getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    }

    setMuted(mute) {
        this.muted = !!mute;
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('truco_sound_muted', this.muted ? 'true' : 'false');
            } catch(e) {}
        }
    }

    // --- Síntesis Procedural de Audio (Fallback Offline Inmune a Caídas de Red) ---
    _playSynthFallback(name) {
        const ctx = this._getAudioContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;

            if (name === 'card-play') {
                // Golpe seco de carta sobre paño (ruido percusivo filtrado + pulso grave)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.09);
            } 
            else if (name === 'card-deal') {
                // Deslizamiento rápido de naipe (flick)
                const bufferSize = ctx.sampleRate * 0.06;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1200, now);
                filter.Q.value = 1.5;

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start(now);
            } 
            else if (name === 'win-baza') {
                // Acorde ascendente victorioso (Do5 -> Sol5)
                [523.25, 783.99].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = now + idx * 0.08;
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.24);
                });
            } 
            else if (name === 'loss') {
                // Tono descendente de baza perdida
                [349.23, 261.63].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = now + idx * 0.1;
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.22);
                });
            }
        } catch(e) {}
    }

    play(name) {
        if (this.muted) return;
        try {
            if (this.sounds && this.sounds[name]) {
                const s = this.sounds[name];
                s.currentTime = 0;
                const p = s.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(() => {
                        // Fallback sintético inmediato si la red o el autoplay bloquean el elemento Audio
                        this._playSynthFallback(name);
                    });
                }
            } else {
                this.reproduceVoz(name);
            }
        } catch(e) {
            this._playSynthFallback(name);
        }
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
    // Desbloqueo automático en la primera interacción del usuario (touch o click)
    const unlockListener = () => {
        if (window.audio && typeof window.audio.unlock === 'function') {
            window.audio.unlock();
        }
    };
    window.addEventListener('pointerdown', unlockListener, { once: true, passive: true });
    window.addEventListener('keydown', unlockListener, { once: true, passive: true });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}
