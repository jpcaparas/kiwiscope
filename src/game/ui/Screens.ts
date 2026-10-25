/** Title, pause and end-of-game overlays. Emits user intents through callbacks. */
export interface ScreenActions {
  start(): void;
  resume(): void;
  restart(): void;
  toggleMute(): boolean;
}

type ScreenId = 'title' | 'pause' | 'end' | 'none';

export class Screens {
  private readonly screens: Record<Exclude<ScreenId, 'none'>, HTMLElement>;

  constructor(actions: ScreenActions) {
    const get = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
    this.screens = { title: get('screen-title'), pause: get('screen-pause'), end: get('screen-end') };
    const bind = (selector: string, fn: () => void): void =>
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => el.addEventListener('click', fn));
    bind('[data-action="start"]', actions.start);
    bind('[data-action="resume"]', actions.resume);
    bind('[data-action="restart"]', actions.restart);
    bind('[data-action="mute"]', () => {
      const muted = actions.toggleMute();
      document.querySelectorAll('[data-action="mute"]').forEach((el) => (el.textContent = muted ? 'Sound: off' : 'Sound: on'));
    });
  }

  show(id: ScreenId): void {
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('hidden', key !== id);
  }

  showEnd(won: boolean, headline: string, detail: string, score: number): void {
    const el = this.screens.end;
    el.classList.toggle('won', won);
    (el.querySelector('[data-field="headline"]') as HTMLElement).textContent = headline;
    (el.querySelector('[data-field="detail"]') as HTMLElement).textContent = detail;
    (el.querySelector('[data-field="score"]') as HTMLElement).textContent = score.toLocaleString('en-NZ');
    this.show('end');
  }
}
