import type * as THREE from 'three';

/** What an enemy is trying to reach this frame. */
export interface TargetInfo {
  position: THREE.Vector3;
  kind: 'nest' | 'player';
  reach: number;
}

export interface BehaviourContext {
  dt: number;
  elapsed: number;
  player: THREE.Vector3;
  nest: THREE.Vector3;
  heightAt(x: number, z: number): number;
}

/**
 * Strategy for how an enemy picks a target and moves. Implementations live in
 * behaviours.ts; enemy definitions reference them by object, not by name.
 */
export interface Behaviour {
  chooseTarget(self: EnemyState, ctx: BehaviourContext): TargetInfo;
  /** Moves `self.position` toward the target and sets facing. */
  move(self: EnemyState, target: TargetInfo, ctx: BehaviourContext): void;
}

export interface EnemyState {
  readonly def: EnemyDef;
  readonly position: THREE.Vector3;
  heading: number;
  health: number;
  /** Per-enemy random phase so herds don't move in lockstep. */
  readonly phase: number;
  attackCooldown: number;
}

/** Static description of an enemy type. Add one and register it to create a new pest. */
export interface EnemyDef {
  name: string;
  health: number;
  speed: number;
  /** Bounding sphere radius used for hits. */
  radius: number;
  /** Height of the hit sphere centre above the enemy origin. */
  centerHeight: number;
  /** Damage per bite to whichever target is in reach. */
  bite: number;
  biteInterval: number;
  score: number;
  /** Chance (0..1) of dropping a pickup on death. */
  dropChance: number;
  furColor: string;
  /** Radar blip override; defaults to a small orange dot. */
  radar?: { color: string; size: number };
  /** Bosses get a bigger death and a special toast. */
  boss?: boolean;
  behaviour: Behaviour;
  build(): THREE.Object3D;
  /** Optional per-frame model animation; walkers get a default scurry hop. */
  animate?(model: THREE.Object3D, elapsed: number, phase: number): void;
}
