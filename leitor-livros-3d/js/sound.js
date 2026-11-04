/**
 * Realistic Paper Flip Sound Synthesizer using Web Audio API
 * Zero latency, 100% offline, no external audio files required.
 */
class PageSoundSynthesizer {
    constructor() {
        this.audioCtx = null;
        this.enabled = true;
    }

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playFlipSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx) return;

        try {
            const ctx = this.audioCtx;
            const now = ctx.currentTime;
            const duration = 0.22; // ~220ms page turn duration

            // Create white noise buffer
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                // Gentle textured noise
                data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass filter to simulate paper frequency response
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(600, now + duration);
            filter.Q.value = 1.8;

            // Highpass filter to eliminate sub-bass rumble
            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 350;

            // Gain envelope (soft swell and rapid decay)
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.001, now);
            gainNode.gain.linearRampToValueAtTime(0.28, now + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Connect nodes
            noise.connect(filter);
            filter.connect(highpass);
            highpass.connect(gainNode);
            gainNode.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('Sound synthesis error:', e);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

window.pageSound = new PageSoundSynthesizer();
