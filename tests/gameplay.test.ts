import { describe, expect, it } from 'vitest';
import { WaveSpawner, interleave, isBossWave, planWave, totalEnemies } from '../src/game/waves/WaveDirector';
import { Weapon } from '../src/game/weapons/Weapon';
import type { FireContext } from '../src/game/combat/types';
import { pickups, rollPickup } from '../src/game/pickups/registry';
import { intermissionDrops, spawnPoint } from '../src/game/spawning';
import { enemies } from '../src/game/enemies/registry';
import { weaponFactories } from '../src/game/weapons/registry';
import { CONFIG } from '../src/game/config';

describe('wave planning', () => {
  it('ramps difficulty and introduces species over time', () => {
    const w1 = planWave(1);
    const w4 = planWave(4);
    expect(totalEnemies(w4)).toBeGreaterThan(totalEnemies(w1));
    expect(w1.groups.map((g) => g.typeId)).not.toContain('wasp');
    expect(w4.groups.map((g) => g.typeId)).toContain('wasp');
    expect(w4.spawnInterval).toBeLessThan(w1.spawnInterval);
  });

  it('puts bosses at the halfway and final waves only', () => {
    const bosses = Array.from({ length: CONFIG.waves.total }, (_, i) => i + 1).filter(isBossWave);
    expect(bosses).toEqual([5, 10]);
    expect(planWave(5).groups.some((g) => g.typeId === 'megaPossum')).toBe(true);
    expect(planWave(4).groups.some((g) => g.typeId === 'megaPossum')).toBe(false);
  });

  it('only references registered enemies', () => {
    for (let w = 1; w <= CONFIG.waves.total; w++) {
      for (const g of planWave(w).groups) expect(enemies.has(g.typeId)).toBe(true);
    }
  });

  it('interleaves species and saves the boss for last', () => {
    expect(interleave(['rat', 'rat', 'megaPossum', 'possum', 'possum'])).toEqual(['rat', 'possum', 'rat', 'possum', 'megaPossum']);
  });

  it('spawner releases everything on schedule', () => {
    const plan = planWave(3);
    const spawner = new WaveSpawner(plan);
    let spawned = 0;
    for (let t = 0; t < 200 && spawner.remaining > 0; t++) spawned += spawner.tick(plan.spawnInterval).length;
    expect(spawned).toBe(totalEnemies(plan));
  });
});

class TestGun extends Weapon {
  shots = 0;
  constructor(automatic = false) {
    super('test', { name: 'Test', blurb: '', magSize: 3, reserveMax: 4, fireInterval: 0.1, reloadTime: 1, automatic, recoil: 0 });
  }
  protected onFire(): void {
    this.shots++;
  }
  buildViewModel(): never {
    throw new Error('not needed');
  }
}

const ctx = {} as FireContext;

describe('Weapon template method', () => {
  it('respects the fire interval and semi-auto trigger', () => {
    const gun = new TestGun();
    expect(gun.tryFire(ctx, true)).toBe('fired');
    expect(gun.tryFire(ctx, true)).toBe('busy'); // cooldown
    gun.update(0.11);
    expect(gun.tryFire(ctx, false)).toBe('busy'); // held trigger on semi-auto
    expect(gun.tryFire(ctx, true)).toBe('fired');
  });

  it('auto-reloads from reserve when the magazine empties', () => {
    const gun = new TestGun(true);
    for (let i = 0; i < 3; i++) {
      gun.tryFire(ctx, false);
      gun.update(0.11);
    }
    expect(gun.ammo).toBe(0);
    expect(gun.reloading).toBe(true);
    gun.update(1.01);
    expect(gun.ammo).toBe(3);
    expect(gun.reserve).toBe(1);
  });

  it('reports empty with no reserve and caps reserve top-ups', () => {
    const gun = new TestGun(true);
    gun.ammo = 0;
    gun.reserve = 0;
    expect(gun.tryFire(ctx, true)).toBe('empty');
    gun.addReserve(99);
    expect(gun.reserve).toBe(4);
  });

  it('every registered weapon constructs with a full magazine', () => {
    for (const make of weaponFactories.values()) {
      const w = make();
      expect(w.ammo).toBe(w.stats.magSize);
      expect(w.reserve).toBe(w.stats.reserveMax);
    }
  });
});

describe('pickups and spawning', () => {
  it('rolls only registered pickups', () => {
    for (const r of [0, 0.2, 0.5, 0.99, 1]) expect(pickups.has(rollPickup(() => r))).toBe(true);
  });

  it('spawns on the rim and away from the player', () => {
    let i = 0;
    const seq = [0, 0.5];
    const p = spawnPoint({ x: CONFIG.arenaRadius - 10, z: 0 }, () => seq[i++ % 2]);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(CONFIG.arenaRadius - 10);
    expect(Math.hypot(p.x - (CONFIG.arenaRadius - 10), p.z)).toBeGreaterThanOrEqual(30);
  });

  it('drops two snacks near the burrow between waves', () => {
    const drops = intermissionDrops(() => 0.5);
    expect(drops).toHaveLength(2);
    for (const d of drops) expect(Math.hypot(d.x, d.z)).toBeLessThanOrEqual(12);
  });
});
