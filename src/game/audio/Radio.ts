import type { Sfx } from './Sfx';

/**
 * Plays the pre-generated DOC radio voice lines (see scripts/generate-voices.mjs).
 * Lines never overlap; a higher-priority line interrupts a lower one.
 */
const clips = import.meta.glob('../../assets/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const urls = new Map<string, string>(
  Object.entries(clips).map(([path, url]) => [path.split('/').pop()!.replace('.mp3', ''), url]),
);

export type LineId = string;

export class Radio {
  private current: HTMLAudioElement | null = null;
  private currentPriority = 0;
  private readonly lastPlayed = new Map<string, number>();
  muted = false;

  constructor(private readonly sfx: Sfx) {}

  /** Plays a line (or one of several variants). Returns false if skipped. */
  say(ids: LineId | LineId[], priority = 1, cooldownSeconds = 0): boolean {
    if (this.muted) return false;
    const options = Array.isArray(ids) ? ids : [ids];
    const id = options[Math.floor(Math.random() * options.length)];
    const url = urls.get(id);
    if (!url) return false;
    const now = performance.now() / 1000;
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < cooldownSeconds) return false;
    if (this.current && !this.current.ended && priority <= this.currentPriority) return false;

    this.stop();
    const audio = new Audio(url);
    audio.volume = 0.95;
    this.current = audio;
    this.currentPriority = priority;
    this.lastPlayed.set(id, now);
    this.sfx.play('squelch');
    void audio.play().catch(() => undefined);
    audio.addEventListener('ended', () => this.sfx.play('squelch'), { once: true });
    return true;
  }

  stop(): void {
    this.current?.pause();
    this.current = null;
    this.currentPriority = 0;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
  }
}
