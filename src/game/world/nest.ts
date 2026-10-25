import * as THREE from 'three';
import { mat, mesh } from './materials';

/**
 * The thing you are defending: a kiwi burrow with eggs and a watchful kiwi.
 * Kiwi lay famously enormous eggs, so they are suitably chunky here.
 */
export function buildNest(): {
  group: THREE.Group;
  animate: (dt: number, elapsed: number) => void;
  setDamage: (fraction: number) => void;
} {
  const group = new THREE.Group();
  const mound = mesh(new THREE.SphereGeometry(2.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#6a4a2c'));
  mound.scale.y = 0.55;
  group.add(mound);
  const hollow = mesh(new THREE.CircleGeometry(0.9, 12), mat('#1e140b'), 0.6, 0.5, 2.0);
  hollow.rotation.x = -0.4;
  group.add(hollow);

  const eggMat = mat('#f3efe3', { roughness: 0.4, emissive: '#000000' });
  for (const [x, z] of [[-0.6, 1.9], [0.0, 2.3], [-1.1, 2.2]] as const) {
    const egg = mesh(new THREE.SphereGeometry(0.32, 10, 8), eggMat, x, 0.35, z);
    egg.scale.y = 1.3;
    group.add(egg);
  }
  // Ring of flax around the burrow, so it reads as a sanctuary.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const blade = mesh(new THREE.ConeGeometry(0.15, 1.6, 3), mat('#3c6b34'), Math.cos(a) * 3, 0.8, Math.sin(a) * 3);
    group.add(blade);
  }

  const kiwi = buildKiwi();
  kiwi.position.set(1.6, 1.55, 1.2);
  group.add(kiwi);

  const glow = new THREE.PointLight('#ffcc66', 0, 10);
  glow.position.set(0, 2, 2);
  group.add(glow);

  return {
    group,
    animate: (_dt, t) => {
      kiwi.rotation.y = Math.sin(t * 0.7) * 0.8;
      kiwi.position.y = 1.55 + Math.abs(Math.sin(t * 3)) * 0.05;
    },
    setDamage: (fraction) => {
      eggMat.emissive.setRGB(fraction * 0.6, 0, 0);
      glow.intensity = fraction * 6;
      glow.color.setRGB(1, 0.3 + (1 - fraction) * 0.5, 0.2);
    },
  };
}

export function buildKiwi(): THREE.Group {
  const g = new THREE.Group();
  const feathers = mat('#6b4a2b');
  const body = mesh(new THREE.SphereGeometry(0.55, 12, 10), feathers);
  body.scale.set(1.2, 0.95, 0.9);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.26, 10, 8), feathers, 0.55, 0.25, 0));
  const beak = mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.9, 6), mat('#e9d9a8'), 1.05, 0.05, 0);
  beak.rotation.z = Math.PI / 2 + 0.5;
  g.add(beak);
  for (const z of [-0.18, 0.18]) {
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), mat('#e9d9a8'), 0, -0.6, z));
    g.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), mat('#111'), 0.68, 0.33, z * 0.6));
  }
  return g;
}
