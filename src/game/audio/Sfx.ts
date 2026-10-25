/**
 * Procedural sound effects via Web Audio: no sample files, just oscillators
 * and filtered noise with short envelopes.
 */
export interface ToneSpec {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
  delay?: number;
}

export interface NoiseSpec {
  duration: number;
  gain: number;
  filter: BiquadFilterType;
  frequency: number;
  q?: number;
  delay?: number;
}

/** Sound recipes by name. Add a key here to add a sound. */
const RECIPES: Record<string, { tones?: ToneSpec[]; noise?: NoiseSpec[] }> = {
  paua: { tones: [{ type: 'square', from: 900, to: 180, duration: 0.09, gain: 0.12 }], noise: [{ duration: 0.06, gain: 0.25, filter: 'highpass', frequency: 1800 }] },
  number8: { tones: [{ type: 'sawtooth', from: 220, to: 50, duration: 0.25, gain: 0.18 }], noise: [{ duration: 0.28, gain: 0.5, filter: 'lowpass', frequency: 1400 }] },
  feijoa: { tones: [{ type: 'triangle', from: 520, to: 260, duration: 0.05, gain: 0.1 }], noise: [{ duration: 0.04, gain: 0.12, filter: 'bandpass', frequency: 2400, q: 2 }] },
  jandal: { tones: [{ type: 'sine', from: 180, to: 90, duration: 0.18, gain: 0.25 }], noise: [{ duration: 0.08, gain: 0.3, filter: 'bandpass', frequency: 900 }] },
  explosion: { tones: [{ type: 'sine', from: 120, to: 30, duration: 0.6, gain: 0.45 }], noise: [{ duration: 0.7, gain: 0.7, filter: 'lowpass', frequency: 700 }] },
  hit: { tones: [{ type: 'square', from: 1400, to: 1200, duration: 0.03, gain: 0.05 }] },
  squeak: { tones: [{ type: 'square', from: 1300, to: 2200, duration: 0.12, gain: 0.08 }, { type: 'square', from: 1800, to: 900, duration: 0.1, gain: 0.06, delay: 0.1 }] },
  bossDie: { tones: [{ type: 'sawtooth', from: 300, to: 40, duration: 1.2, gain: 0.3 }], noise: [{ duration: 1.0, gain: 0.5, filter: 'lowpass', frequency: 500 }] },
  hurt: { tones: [{ type: 'sine', from: 160, to: 70, duration: 0.2, gain: 0.35 }] },
  nestHurt: { tones: [{ type: 'triangle', from: 880, to: 660, duration: 0.12, gain: 0.08 }] },
  pickup: { tones: [{ type: 'sine', from: 660, to: 660, duration: 0.08, gain: 0.15 }, { type: 'sine', from: 990, to: 990, duration: 0.12, gain: 0.15, delay: 0.08 }] },
  reload: { noise: [{ duration: 0.04, gain: 0.25, filter: 'highpass', frequency: 3000 }, { duration: 0.05, gain: 0.25, filter: 'highpass', frequency: 2400, delay: 0.25 }] },
  dry: { noise: [{ duration: 0.03, gain: 0.2, filter: 'highpass', frequency: 4000 }] },
  switch: { noise: [{ duration: 0.05, gain: 0.15, filter: 'bandpass', frequency: 1500 }] },
  // Male kiwi call: a shrill, rising whistle repeated a few times.
  kiwiCall: {
    tones: [0, 0.32, 0.64, 0.96].map((delay) => ({ type: 'sine' as const, from: 1500, to: 3100, duration: 0.26, gain: 0.07, delay })),
  },
  // Tūī-ish ambient chirp: a quick warble.
  tui: { tones: [{ type: 'sine', from: 2200, to: 3400, duration: 0.07, gain: 0.03 }, { type: 'sine', from: 1200, to: 900, duration: 0.09, gain: 0.025, delay: 0.09 }, { type: 'sine', from: 2800, to: 2600, duration: 0.05, gain: 0.03, delay: 0.2 }] },
  squelch: { noise: [{ duration: 0.12, gain: 0.12, filter: 'bandpass', frequency: 2000, q: 1.5 }] },
};

export type SoundName = keyof typeof RECIPES;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.8;
  }

  play(name: SoundName, pitch = 1): void {
    const recipe = RECIPES[name];
    if (!this.ctx || !this.master || this.muted || !recipe) return;
    for (const t of recipe.tones ?? []) this.tone(t, pitch);
    for (const n of recipe.noise ?? []) this.noise(n);
  }

  private tone(spec: ToneSpec, pitch: number): void {
    const ctx = this.ctx as AudioContext;
    const start = ctx.currentTime + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from * pitch, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.to * pitch), start + spec.duration);
    const env = this.envelope(start, spec.duration, spec.gain);
    osc.connect(env);
    osc.start(start);
    osc.stop(start + spec.duration + 0.02);
  }

  private noise(spec: NoiseSpec): void {
    const ctx = this.ctx as AudioContext;
    const start = ctx.currentTime + (spec.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = spec.filter;
    filter.frequency.value = spec.frequency;
    filter.Q.value = spec.q ?? 0.7;
    src.connect(filter).connect(this.envelope(start, spec.duration, spec.gain));
    src.start(start);
    src.stop(start + spec.duration + 0.02);
  }

  private envelope(start: number, duration: number, gain: number): GainNode {
    const ctx = this.ctx as AudioContext;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    env.connect(this.master as GainNode);
    return env;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
