import type * as THREE from 'three';
import type { ProjectileSink, ProjectileSpec } from './types';
import type { EnemyManager } from '../enemies/EnemyManager';

/** Ballistic projectiles that detonate on enemies, the ground, or fuse expiry. */
export class ProjectileSystem implements ProjectileSink {
  private readonly live: ProjectileSpec[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly enemies: EnemyManager,
    private readonly heightAt: (x: number, z: number) => number,
  ) {}

  launch(spec: ProjectileSpec): void {
    this.scene.add(spec.object);
    this.live.push(spec);
  }

  update(dt: number): void {
    for (const p of [...this.live]) this.step(p, dt);
  }

  clear(): void {
    for (const p of this.live) this.scene.remove(p.object);
    this.live.length = 0;
  }

  private step(p: ProjectileSpec, dt: number): void {
    p.velocity.y -= p.gravity * dt;
    p.position.addScaledVector(p.velocity, dt);
    p.object.rotation.x += dt * 14;
    p.object.rotation.y += dt * 5;
    p.fuse -= dt;
    if (p.fuse <= 0 || p.position.y <= this.heightAt(p.position.x, p.position.z) || this.touchesEnemy(p)) {
      this.detonate(p);
    }
  }

  private touchesEnemy(p: ProjectileSpec): boolean {
    return this.enemies.active.some((e) => this.enemies.hitCenter(e).distanceTo(p.position) < e.def.radius + p.radius);
  }

  private detonate(p: ProjectileSpec): void {
    const i = this.live.indexOf(p);
    if (i >= 0) this.live.splice(i, 1);
    this.scene.remove(p.object);
    p.onImpact(p.position.clone());
  }
}
