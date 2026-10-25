import { CONFIG } from './config';
import { rollPickup } from './pickups/registry';

/**
 * Picks a spawn point on the arena rim, at least `minPlayerDistance` from the
 * player so nothing pops into existence in their face. Pure for testing.
 */
export function spawnPoint(
  player: { x: number; z: number },
  random: () => number,
  minPlayerDistance = 30,
): { x: number; z: number } {
  const r = CONFIG.arenaRadius - 10;
  let best = { x: r, z: 0 };
  let bestDist = -1;
  for (let i = 0; i < 8; i++) {
    const a = random() * Math.PI * 2;
    const p = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d >= minPlayerDistance) return p;
    if (d > bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/** Two snacks dropped near the burrow between waves. */
export function intermissionDrops(random: () => number): { id: string; x: number; z: number }[] {
  return [0, 1].map((i) => {
    const a = random() * Math.PI * 2 + i * Math.PI;
    const r = 6 + random() * 6;
    return { id: rollPickup(random), x: Math.cos(a) * r, z: Math.sin(a) * r };
  });
}
