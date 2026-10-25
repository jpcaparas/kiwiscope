import type { Vec3Like } from '../core/math';

/**
 * Marches a ray against a height field. Returns the distance to the first
 * point below ground, or null if the ray stays above ground for maxDistance.
 */
export function terrainRay(
  origin: Vec3Like,
  dir: Vec3Like,
  maxDistance: number,
  heightAt: (x: number, z: number) => number,
  step = 0.75,
): number | null {
  for (let d = step; d <= maxDistance; d += step) {
    const x = origin.x + dir.x * d;
    const y = origin.y + dir.y * d;
    const z = origin.z + dir.z * d;
    if (y < heightAt(x, z)) return d;
  }
  return null;
}
