import { CONFIG } from '../config';

export interface WaveGroup {
  typeId: string;
  count: number;
}

export interface WavePlan {
  wave: number;
  boss: boolean;
  groups: WaveGroup[];
  /** Seconds between individual spawns. */
  spawnInterval: number;
}

/** Halfway and final waves bring a Mega Possum. */
export const isBossWave = (wave: number): boolean => wave === Math.ceil(CONFIG.waves.total / 2) || wave === CONFIG.waves.total;

/**
 * Wave composition as a pure function of the wave number. Rats from the start,
 * stoats from wave 2, wasps from wave 3; numbers ramp roughly linearly.
 */
export function planWave(wave: number): WavePlan {
  const groups: WaveGroup[] = [
    { typeId: 'possum', count: 2 + wave },
    { typeId: 'rat', count: 2 + Math.floor(wave * 1.5) },
    { typeId: 'stoat', count: wave >= 2 ? Math.floor(wave * 0.8) : 0 },
    { typeId: 'wasp', count: wave >= 3 ? Math.floor((wave - 1) * 0.9) : 0 },
    { typeId: 'megaPossum', count: isBossWave(wave) ? 1 : 0 },
  ].filter((g) => g.count > 0);
  return {
    wave,
    boss: isBossWave(wave),
    groups,
    spawnInterval: Math.max(0.35, 1.6 - wave * 0.12),
  };
}

export const totalEnemies = (plan: WavePlan): number => plan.groups.reduce((n, g) => n + g.count, 0);

/**
 * Turns a plan into a timed spawn queue. Spawn order is interleaved so each
 * wave feels mixed rather than arriving species by species.
 */
export class WaveSpawner {
  private readonly queue: string[];
  private timer = 0;

  constructor(
    readonly plan: WavePlan,
    shuffle: (items: string[]) => string[] = interleave,
  ) {
    this.queue = shuffle(plan.groups.flatMap((g) => Array<string>(g.count).fill(g.typeId)));
  }

  get remaining(): number {
    return this.queue.length;
  }

  /** Returns the enemy type ids to spawn this frame. */
  tick(dt: number): string[] {
    this.timer -= dt;
    const out: string[] = [];
    while (this.timer <= 0 && this.queue.length > 0) {
      out.push(this.queue.shift() as string);
      this.timer += this.plan.spawnInterval;
    }
    return out;
  }
}

/** Deterministic round-robin across types; bosses arrive last for drama. */
export function interleave(items: string[]): string[] {
  const buckets = new Map<string, string[]>();
  for (const id of items) {
    const b = buckets.get(id) ?? [];
    b.push(id);
    buckets.set(id, b);
  }
  const boss = buckets.get('megaPossum') ?? [];
  buckets.delete('megaPossum');
  const out: string[] = [];
  const lists = [...buckets.values()];
  while (lists.some((l) => l.length > 0)) {
    for (const l of lists) if (l.length) out.push(l.shift() as string);
  }
  return [...out, ...boss];
}
