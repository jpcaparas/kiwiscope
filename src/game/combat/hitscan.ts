import * as THREE from 'three';
import type { FireContext } from './types';
import { terrainRay } from './terrainRay';

/**
 * Fires one instant ray. Terrain blocks shots; the nearest enemy in front of
 * the terrain takes the damage. Returns true on an enemy hit.
 */
export function hitscan(ctx: FireContext, dir: THREE.Vector3, damage: number, range: number, tracerColor: string): boolean {
  const ground = terrainRay(ctx.origin, dir, range, ctx.heightAt);
  const limit = ground ?? range;
  const hit = ctx.enemies.raycast(ctx.origin, dir, limit);
  const end = hit ? hit.point : ctx.origin.clone().addScaledVector(dir, limit);
  ctx.fx.tracer(ctx.muzzle, end, tracerColor);
  if (hit) {
    ctx.enemies.damage(hit.enemy, damage, hit.point);
    ctx.fx.puff(hit.point, hit.enemy.def.furColor, 6, 3);
    return true;
  }
  if (ground !== null) ctx.fx.puff(end, '#6b4a2b', 4, 2);
  return false;
}

/** Random direction within a cone of `spread` radians around `dir`. */
export function spreadDirection(dir: THREE.Vector3, spread: number): THREE.Vector3 {
  if (spread <= 0) return dir.clone();
  const up = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * spread;
  return dir.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(realUp, Math.sin(a) * r).normalize();
}
