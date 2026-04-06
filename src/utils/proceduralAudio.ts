// proceduralAudio.ts

class ProceduralAudio {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    constructor() {
        try {
            // @ts-ignore - Handle Safari prefix if needed
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.5;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    private initCtx() {
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playWaterSound() {
        if (!this.ctx || !this.masterGain) return;
        this.initCtx();

        // Create brown noise for water texture
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (0 + white) / 2; // Simple smoothing for "brown-ish" noise
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Filter to make it sound liquid
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 1.0);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
        noise.stop(this.ctx.currentTime + 2);
    }

    playChime() {
        if (!this.ctx || !this.masterGain) return;
        this.initCtx();

        // Fundamental frequency for a "crystalline" C major chord
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        freqs.forEach((f, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'sine';
            osc.frequency.value = f;

            // Envelope
            const now = this.ctx!.currentTime;
            const delay = i * 0.05; // Arpeggio effect

            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.05); // Attack
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.0); // Decay

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now + delay);
            osc.stop(now + delay + 2.5);
        });
    }
}

export const audioSystem = new ProceduralAudio();
