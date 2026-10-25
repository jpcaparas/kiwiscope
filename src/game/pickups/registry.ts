import * as THREE from 'three';
import { Registry } from '../core/Registry';
import { mat } from '../world/materials';

/** What a pickup can affect. Kept narrow so pickups can't reach into game internals. */
export interface PickupTarget {
  healPlayer(amount: number): boolean;
  repairNest(amount: number): boolean;
  refillAmmo(fraction: number): boolean;
}

export interface PickupDef {
  label: string;
  /** Relative drop weight. */
  weight: number;
  build(): THREE.Object3D;
  /** Returns false if the pickup wasn't needed (it stays on the ground). */
  apply(target: PickupTarget): boolean;
}

function lemonSoda(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), mat('#9a5a2a', { emissive: '#3a1a00' })));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.18, 10), mat('#f4d21f', { emissive: '#4a3a00' }));
  g.add(label);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.22, 10), mat('#9a5a2a'));
  neck.position.y = 0.36;
  g.add(neck);
  return g;
}

function meatPie(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.18, 14), mat('#c98a3c', { emissive: '#3a2000' })));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 14), mat('#e0a95a'));
  top.position.y = 0.1;
  g.add(top);
  return g;
}

function pavlova(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.26, 14), mat('#fbf6ec', { emissive: '#333028' })));
  const fruit = [['#7fb24a', 0.12, 0.05], ['#d1202f', -0.1, 0.08], ['#7fb24a', 0.0, -0.13], ['#f2c014', -0.14, -0.06]] as const;
  for (const [c, x, z] of fruit) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(c));
    f.position.set(x, 0.16, z);
    g.add(f);
  }
  return g;
}

function pineappleChews(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), mat('#f4d21f', { emissive: '#4a3a00' })));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.08, 0.31), mat('#7a4a1e'));
  g.add(stripe);
  return g;
}

/**
 * Kiwi tucker. Health from a lemon soda or a meat pie, ammo from a bag of
 * pineapple chews, and a pavlova patches up the nest (don't ask how).
 */
export const pickups = new Registry<PickupDef>('pickup')
  .register('lemonSoda', { label: 'Lemon & Paeroa +30 health', weight: 4, build: lemonSoda, apply: (t) => t.healPlayer(30) })
  .register('meatPie', { label: 'Mince & cheese pie +60 health', weight: 1.5, build: meatPie, apply: (t) => t.healPlayer(60) })
  .register('pineappleChews', { label: 'Pineapple chews: ammo restocked', weight: 4, build: pineappleChews, apply: (t) => t.refillAmmo(0.5) })
  .register('pavlova', { label: 'Pavlova: nest repaired +25', weight: 2, build: pavlova, apply: (t) => t.repairNest(25) });

/** Weighted random pick of a pickup id. */
export function rollPickup(random: () => number = Math.random): string {
  const all = pickups.ids().map((id) => [id, pickups.get(id).weight] as const);
  const total = all.reduce((s, [, w]) => s + w, 0);
  let r = random() * total;
  for (const [id, w] of all) {
    r -= w;
    if (r <= 0) return id;
  }
  return all[all.length - 1][0];
}
