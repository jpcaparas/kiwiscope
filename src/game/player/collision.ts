import type { Collider } from '../world/World';

/**
 * Pushes a circle at (x, z) out of any overlapping colliders and keeps it
 * inside the arena. Pure so it can be unit tested.
 */
export function resolveCollisions(
  pos: { x: number; z: number },
  radius: number,
  colliders: readonly Collider[],
  arenaRadius: number,
): void {
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = c.r + radius;
    const d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-6) {
      pos.x = c.x + min;
      continue;
    }
    pos.x = c.x + (dx / d) * min;
    pos.z = c.z + (dz / d) * min;
  }
  const r = Math.hypot(pos.x, pos.z);
  if (r > arenaRadius) {
    pos.x *= arenaRadius / r;
    pos.z *= arenaRadius / r;
  }
}
