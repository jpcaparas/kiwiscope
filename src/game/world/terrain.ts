import { clamp } from '../core/math';

/**
 * Height field for rolling Waikato-style farmland. Pure and deterministic so
 * gameplay (player, enemies, pickups) and the rendered mesh always agree.
 *
 * The centre is flattened for the kiwi nest and the rim rises into hills that
 * act as a natural arena wall.
 */
export function heightAt(x: number, z: number): number {
  const rolling =
    Math.sin(x * 0.045) * 2.2 +
    Math.cos(z * 0.05) * 1.8 +
    Math.sin((x + z) * 0.11) * 0.7 +
    Math.cos((x - z) * 0.083) * 0.9;
  const r = Math.hypot(x, z);
  const flatten = clamp((r - 8) / 22, 0, 1); // 0 at the nest, 1 by r=30
  const rim = Math.pow(clamp((r - 80) / 30, 0, 1), 2) * 26;
  return rolling * flatten + rim;
}
