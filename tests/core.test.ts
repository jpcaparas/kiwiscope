import { describe, expect, it, vi } from 'vitest';
import { Registry } from '../src/game/core/Registry';
import { EventBus } from '../src/game/core/EventBus';
import { createRng, pick, range } from '../src/game/core/rng';
import { clamp, raySphere } from '../src/game/core/math';

describe('Registry', () => {
  it('registers and retrieves items in insertion order', () => {
    const r = new Registry<number>('thing').register('a', 1).register('b', 2);
    expect(r.get('b')).toBe(2);
    expect(r.ids()).toEqual(['a', 'b']);
    expect(r.values()).toEqual([1, 2]);
    expect(r.has('c')).toBe(false);
  });

  it('rejects duplicates and unknown ids', () => {
    const r = new Registry<number>('thing').register('a', 1);
    expect(() => r.register('a', 2)).toThrow(/Duplicate thing/);
    expect(() => r.get('zz')).toThrow(/Unknown thing/);
  });
});

describe('EventBus', () => {
  it('delivers payloads and supports unsubscribe', () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const fn = vi.fn();
    const off = bus.on('ping', fn);
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
  });
});

describe('rng', () => {
  it('is deterministic per seed and within [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 50 }, a);
    expect(seqA).toEqual(Array.from({ length: 50 }, b));
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('range and pick stay in bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = range(rng, 3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(5);
      expect(['x', 'y']).toContain(pick(rng, ['x', 'y']));
    }
  });
});

describe('math', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it('raySphere finds hits in front, misses behind and beside', () => {
    const o = { x: 0, y: 0, z: 0 };
    const fwd = { x: 0, y: 0, z: -1 };
    expect(raySphere(o, fwd, { x: 0, y: 0, z: -10 }, 1)).toBeCloseTo(9);
    expect(raySphere(o, fwd, { x: 0, y: 0, z: 10 }, 1)).toBeNull();
    expect(raySphere(o, fwd, { x: 5, y: 0, z: -10 }, 1)).toBeNull();
    expect(raySphere(o, fwd, { x: 0, y: 0, z: 0 }, 1)).toBe(0);
  });
});
