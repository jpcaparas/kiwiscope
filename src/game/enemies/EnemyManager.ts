import * as THREE from 'three';
import { raySphere } from '../core/math';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../events';
import type { BehaviourContext, EnemyDef, EnemyState } from './types';
import { enemies as enemyRegistry } from './registry';

export interface Enemy extends EnemyState {
  readonly id: number;
  readonly typeId: string;
  readonly object: THREE.Object3D;
  /** Seconds of white hit-flash remaining. */
  flash: number;
}

export interface RayHit {
  enemy: Enemy;
  distance: number;
  point: THREE.Vector3;
}

/** Owns live enemies: spawning, behaviour ticks, biting, hit tests and death. */
export class EnemyManager {
  readonly active: Enemy[] = [];
  private nextId = 1;
  private readonly center = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly events: EventBus<GameEvents>,
  ) {}

  get count(): number {
    return this.active.length;
  }

  spawn(typeId: string, x: number, z: number, y: number): Enemy {
    const def = enemyRegistry.get(typeId);
    // Container keeps hit-flash scaling separate from the model's own scale.
    const object = new THREE.Group();
    object.add(def.build());
    object.position.set(x, y, z);
    this.scene.add(object);
    const enemy: Enemy = {
      id: this.nextId++,
      typeId,
      def,
      object,
      position: object.position,
      heading: 0,
      health: def.health,
      phase: Math.random() * Math.PI * 2,
      attackCooldown: def.biteInterval,
      flash: 0,
    };
    this.active.push(enemy);
    return enemy;
  }

  update(ctx: BehaviourContext): void {
    for (const enemy of this.active) this.tick(enemy, ctx);
  }

  /** Nearest enemy hit along a normalised ray, within maxDistance. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDistance: number): RayHit | null {
    let best: RayHit | null = null;
    for (const enemy of this.active) {
      const d = raySphere(origin, dir, this.hitCenter(enemy), enemy.def.radius);
      if (d === null || d > maxDistance || (best && d >= best.distance)) continue;
      best = { enemy, distance: d, point: origin.clone().addScaledVector(dir, d) };
    }
    return best;
  }

  /** Damages every enemy whose hit sphere touches the blast radius. */
  explode(point: THREE.Vector3, radius: number, damage: number): number {
    let hits = 0;
    for (const enemy of [...this.active]) {
      const d = this.hitCenter(enemy).distanceTo(point) - enemy.def.radius;
      if (d > radius) continue;
      const falloff = 1 - Math.max(0, d) / radius;
      this.damage(enemy, damage * (0.4 + 0.6 * falloff), point);
      hits++;
    }
    return hits;
  }

  damage(enemy: Enemy, amount: number, at: THREE.Vector3): void {
    if (enemy.health <= 0) return;
    enemy.health -= amount;
    enemy.flash = 0.08;
    this.events.emit('enemyHit', { typeId: enemy.typeId, position: at.clone(), amount });
    if (enemy.health <= 0) this.kill(enemy);
  }

  clear(): void {
    for (const enemy of this.active) this.scene.remove(enemy.object);
    this.active.length = 0;
  }

  hitCenter(enemy: Enemy): THREE.Vector3 {
    return this.center.set(enemy.position.x, enemy.position.y + enemy.def.centerHeight, enemy.position.z);
  }

  private tick(enemy: Enemy, ctx: BehaviourContext): void {
    const { behaviour } = enemy.def;
    const target = behaviour.chooseTarget(enemy, ctx);
    behaviour.move(enemy, target, ctx);
    enemy.object.rotation.y = enemy.heading;
    const model = enemy.object.children[0];
    if (enemy.def.animate) enemy.def.animate(model, ctx.elapsed, enemy.phase);
    else enemy.position.y += Math.abs(Math.sin(ctx.elapsed * enemy.def.speed * 2.2 + enemy.phase)) * 0.08;

    enemy.flash = Math.max(0, enemy.flash - ctx.dt);
    enemy.object.scale.setScalar(enemy.flash > 0 ? 1.12 : 1);

    enemy.attackCooldown -= ctx.dt;
    const dist = Math.hypot(target.position.x - enemy.position.x, target.position.z - enemy.position.z);
    if (dist > target.reach + enemy.def.radius || enemy.attackCooldown > 0) return;
    enemy.attackCooldown = enemy.def.biteInterval;
    this.events.emit(target.kind === 'nest' ? 'nestBitten' : 'playerBitten', { amount: enemy.def.bite, typeId: enemy.typeId });
  }

  private kill(enemy: Enemy): void {
    const i = this.active.indexOf(enemy);
    if (i >= 0) this.active.splice(i, 1);
    this.scene.remove(enemy.object);
    this.events.emit('enemyKilled', {
      typeId: enemy.typeId,
      def: enemy.def,
      position: this.hitCenter(enemy).clone(),
    });
  }
}

export type { EnemyDef };
