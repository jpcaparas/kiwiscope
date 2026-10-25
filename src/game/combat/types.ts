import type * as THREE from 'three';
import type { EnemyManager } from '../enemies/EnemyManager';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../events';

/** Visual effects a weapon may request. Implemented by fx/Effects. */
export interface FxSink {
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: string): void;
  puff(at: THREE.Vector3, color: string, count?: number, speed?: number): void;
  blast(at: THREE.Vector3, radius: number): void;
}

export interface ProjectileSpec {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  gravity: number;
  radius: number;
  object: THREE.Object3D;
  /** Seconds before it detonates on its own. */
  fuse: number;
  onImpact(at: THREE.Vector3): void;
}

export interface ProjectileSink {
  launch(spec: ProjectileSpec): void;
}

/** Everything a weapon needs at the moment it fires. */
export interface FireContext {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  enemies: EnemyManager;
  projectiles: ProjectileSink;
  fx: FxSink;
  events: EventBus<GameEvents>;
  heightAt(x: number, z: number): number;
  /** World-space muzzle position for tracers. */
  muzzle: THREE.Vector3;
}
