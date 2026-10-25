import type * as THREE from 'three';
import type { EnemyDef } from './enemies/types';

/** Every cross-system notification in the game. HUD, audio and FX subscribe; gameplay emits. */
export interface GameEvents extends Record<string, unknown> {
  enemyHit: { typeId: string; position: THREE.Vector3; amount: number };
  enemyKilled: { typeId: string; def: EnemyDef; position: THREE.Vector3 };
  nestBitten: { amount: number; typeId: string };
  playerBitten: { amount: number; typeId: string };
  weaponFired: { weaponId: string };
  weaponSwitched: { weaponId: string; name: string };
  reloadStarted: { weaponId: string };
  dryFire: { weaponId: string };
  explosion: { position: THREE.Vector3; radius: number };
  pickupCollected: { id: string; label: string };
  waveStarted: { wave: number; total: number; boss: boolean };
  waveCleared: { wave: number };
}
