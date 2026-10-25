import { describe, expect, it } from 'vitest';
import { heightAt } from '../src/game/world/terrain';
import { resolveCollisions } from '../src/game/player/collision';
import { terrainRay } from '../src/game/combat/terrainRay';

describe('terrain', () => {
  it('is flat at the nest and rises at the rim', () => {
    expect(heightAt(0, 0)).toBeCloseTo(0);
    expect(heightAt(3, 4)).toBeCloseTo(0);
    expect(heightAt(110, 0)).toBeGreaterThan(15);
  });

  it('is deterministic', () => {
    expect(heightAt(12.3, -40.1)).toBe(heightAt(12.3, -40.1));
  });
});

describe('resolveCollisions', () => {
  it('pushes the player out of a collider', () => {
    const pos = { x: 0.5, z: 0 };
    resolveCollisions(pos, 0.5, [{ x: 0, z: 0, r: 1 }], 100);
    expect(Math.hypot(pos.x, pos.z)).toBeCloseTo(1.5);
  });

  it('handles exact overlap without NaN', () => {
    const pos = { x: 2, z: 2 };
    resolveCollisions(pos, 0.5, [{ x: 2, z: 2, r: 1 }], 100);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(pos.x).toBeCloseTo(3.5);
  });

  it('keeps the player inside the arena', () => {
    const pos = { x: 300, z: 0 };
    resolveCollisions(pos, 0.5, [], 95);
    expect(pos.x).toBeCloseTo(95);
  });
});

describe('terrainRay', () => {
  const flat = (): number => 0;
  it('hits the ground when aimed down', () => {
    const d = terrainRay({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 }, 10, flat, 0.1);
    expect(d).not.toBeNull();
    expect(d as number).toBeGreaterThan(2);
    expect(d as number).toBeLessThan(2.2);
  });

  it('returns null for a level ray above ground', () => {
    expect(terrainRay({ x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: -1 }, 50, flat)).toBeNull();
  });
});
