import * as THREE from 'three';
import { Registry } from '../core/Registry';
import type { Rng } from '../core/rng';
import { range } from '../core/rng';
import { mat, mesh } from './materials';
import { corrugatedTexture, kiwiSignTexture, lemonLabelTexture } from './textures';

/**
 * A scenery item. To add a new Kiwiana landmark: write a `build` function,
 * register it below, and the world scatters it automatically.
 */
export interface PropDef {
  /** Builds one instance; origin at ground level. */
  build(rng: Rng): THREE.Object3D;
  /** Player collision radius (0 = walk-through). */
  collider: number;
  /** How many to scatter (landmarks use 1 with a fixed spot). */
  count: number;
  /** Fixed placement for landmarks, in world XZ. */
  fixed?: ReadonlyArray<readonly [number, number, number]>; // x, z, rotationY
  /** Scatter band (distance from the nest). */
  band?: readonly [number, number];
}

function pohutukawa(rng: Rng): THREE.Object3D {
  // New Zealand Christmas tree: gnarly trunk, dark canopy, crimson blossoms.
  const g = new THREE.Group();
  const trunkH = range(rng, 2.2, 3.2);
  const trunk = mesh(new THREE.CylinderGeometry(0.35, 0.6, trunkH, 6), mat('#5b3a24'), 0, trunkH / 2, 0);
  trunk.rotation.z = range(rng, -0.15, 0.15);
  g.add(trunk);
  const leaf = mat('#2b5a2e');
  const bloom = mat('#d1202f', { emissive: '#5a0008', emissiveIntensity: 0.4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng();
    const r = range(rng, 1.2, 2.2);
    const s = range(rng, 1.4, 2.1);
    const blob = mesh(new THREE.IcosahedronGeometry(s, 0), leaf, Math.cos(a) * r, trunkH + range(rng, 0.2, 1.4), Math.sin(a) * r);
    g.add(blob);
    for (let k = 0; k < 4; k++) {
      const f = mesh(new THREE.IcosahedronGeometry(0.28, 0), bloom);
      f.position.copy(blob.position).add(new THREE.Vector3(range(rng, -s, s) * 0.8, s * 0.7, range(rng, -s, s) * 0.8));
      g.add(f);
    }
  }
  return g;
}

function ponga(rng: Rng): THREE.Object3D {
  // Silver tree fern: tall hairy trunk with a crown of arching fronds.
  const g = new THREE.Group();
  const h = range(rng, 3, 5);
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 6), mat('#3b2b1e'), 0, h / 2, 0));
  const frond = mat('#3f7d3a', { side: THREE.DoubleSide });
  const under = mat('#c9d8cf', { side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const blade = new THREE.Group();
    const leafGeo = new THREE.PlaneGeometry(0.6, 2.8, 1, 3);
    const top = mesh(leafGeo, frond, 0, 1.4, 0);
    const bottom = mesh(leafGeo, under, 0, 1.4, -0.01);
    bottom.rotation.y = Math.PI;
    blade.add(top, bottom);
    blade.position.y = h;
    blade.rotation.set(0, a, 0);
    blade.rotateX(range(rng, 1.0, 1.3));
    g.add(blade);
  }
  return g;
}

function cabbageTree(rng: Rng): THREE.Object3D {
  // Tī kōuka: skinny trunk, spiky pom-pom heads.
  const g = new THREE.Group();
  const h = range(rng, 3, 4.5);
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.24, h, 5), mat('#7a6a55'), 0, h / 2, 0));
  const heads = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < heads; i++) {
    const a = rng() * Math.PI * 2;
    const off = heads > 1 ? 0.6 : 0;
    const head = mesh(new THREE.ConeGeometry(0.9, 1.4, 7), mat('#6f9a3c'), Math.cos(a) * off, h + 0.4, Math.sin(a) * off);
    head.rotation.x = Math.PI; // spikes fan downward
    g.add(head, mesh(new THREE.ConeGeometry(0.7, 1.1, 7), mat('#86b04a'), head.position.x, h + 1, head.position.z));
  }
  return g;
}

function sheep(rng: Rng): THREE.Object3D {
  const g = new THREE.Group();
  const wool = mat('#efece4');
  g.add(mesh(new THREE.DodecahedronGeometry(0.75, 0), wool, 0, 0.9, 0));
  g.add(mesh(new THREE.DodecahedronGeometry(0.45, 0), wool, 0.55, 1.05, 0.25));
  g.add(mesh(new THREE.DodecahedronGeometry(0.45, 0), wool, -0.5, 1.0, -0.2));
  g.add(mesh(new THREE.BoxGeometry(0.45, 0.4, 0.35), mat('#2a2522'), 0.95, 1.0, 0));
  for (const [x, z] of [[0.4, 0.3], [0.4, -0.3], [-0.4, 0.3], [-0.4, -0.3]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 4), mat('#2a2522'), x, 0.3, z));
  }
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

function flaxBush(rng: Rng): THREE.Object3D {
  // Harakeke: a fountain of long blade leaves.
  const g = new THREE.Group();
  const blade = mat(rng() > 0.5 ? '#3c6b34' : '#5a6b2c', { side: THREE.DoubleSide });
  for (let i = 0; i < 12; i++) {
    const b = mesh(new THREE.PlaneGeometry(0.18, range(rng, 1.4, 2.2)), blade);
    b.position.y = 0.8;
    b.rotation.y = rng() * Math.PI;
    b.rotation.z = range(rng, -0.45, 0.45);
    g.add(b);
  }
  return g;
}

function bach(): THREE.Object3D {
  // The classic weatherboard holiday home with a corrugated iron roof.
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(8, 3, 5.5), mat('#e4dcc6'), 0, 1.5, 0));
  const roofTex = corrugatedTexture('#b23a2c');
  roofTex.repeat.set(3, 1);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
  const pitch = Math.atan2(2, 2.75); // 2 m gable over a 2.75 m half-span
  for (const side of [-1, 1]) {
    const panel = mesh(new THREE.PlaneGeometry(8.8, 3.6), roofMat, 0, 4, side * 1.375);
    panel.rotation.x = -Math.PI / 2 + side * pitch;
    g.add(panel);
  }
  const gable = new THREE.Shape([new THREE.Vector2(-2.75, 0), new THREE.Vector2(2.75, 0), new THREE.Vector2(0, 2)]);
  for (const side of [-1, 1]) {
    const tri = mesh(new THREE.ShapeGeometry(gable), mat('#e4dcc6', { side: THREE.DoubleSide }), side * 4, 3, 0);
    tri.rotation.y = Math.PI / 2;
    g.add(tri);
  }
  g.add(mesh(new THREE.BoxGeometry(0.1, 2, 1), mat('#2d6c8f'), 4.01, 1, 0)); // door
  g.add(mesh(new THREE.BoxGeometry(0.1, 1, 1.4), mat('#9fd0e8', { emissive: '#203040' }), 4.01, 1.8, 1.8)); // window
  g.add(mesh(new THREE.BoxGeometry(3, 0.2, 5.5), mat('#8a6a48'), 5.5, 0.1, 0)); // deck
  return g;
}

function giantBottle(): THREE.Object3D {
  // Paeroa's famous big lemon-soda bottle, generic label.
  const g = new THREE.Group();
  const glass = mat('#9a5a2a', { roughness: 0.3 });
  g.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 5, 16), glass, 0, 2.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.5, 1.4, 1.6, 16), glass, 0, 5.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16), glass, 0, 7.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 16), mat('#d8c23a', { metalness: 0.6 }), 0, 7.9, 0));
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, 1.6, 24, 1, true),
    new THREE.MeshStandardMaterial({ map: lemonLabelTexture(), roughness: 0.6 }),
  );
  label.position.y = 2.6;
  g.add(label);
  return g;
}

function giantCarrot(): THREE.Object3D {
  // Ohakune's big carrot.
  const g = new THREE.Group();
  const body = mesh(new THREE.ConeGeometry(1.3, 7, 10), mat('#e8731e'), 0, 4, 0);
  body.rotation.z = Math.PI;
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.3, 2.4, 5), mat('#3f8a32'), 0, 8.4, 0);
    leaf.rotation.z = (i - 2) * 0.3;
    leaf.rotation.x = (i % 2 ? 1 : -1) * 0.25;
    g.add(leaf);
  }
  return g;
}

function giantGumboot(): THREE.Object3D {
  // Taihape: gumboot capital of the world.
  const g = new THREE.Group();
  const rubber = mat('#1d1d1d', { roughness: 0.6 });
  g.add(mesh(new THREE.BoxGeometry(2, 6, 2), rubber, 0, 3.4, 0));
  g.add(mesh(new THREE.BoxGeometry(4.2, 1.6, 2.2), rubber, 1.1, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(2.1, 0.3, 2.1), mat('#c22a22'), 0, 6.3, 0));
  return g;
}

function buzzyBee(): THREE.Object3D {
  // The iconic pull-along wooden toy, at heroic scale.
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(1.1, 12, 10), mat('#f3c21b'), 0, 1.9, 0));
  for (const x of [-0.5, 0, 0.5]) {
    const stripe = mesh(new THREE.TorusGeometry(1.08, 0.12, 6, 18), mat('#e23222'), x, 1.9, 0);
    stripe.rotation.y = Math.PI / 2;
    g.add(stripe);
  }
  g.add(mesh(new THREE.SphereGeometry(0.7, 10, 8), mat('#e23222'), 1.4, 2.2, 0));
  for (const z of [-0.8, 0.8]) {
    const wing = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 14), mat('#e23222'), 0, 3.0, z);
    wing.rotation.x = z * 0.6;
    g.add(wing);
  }
  for (const [x, z] of [[0.7, 0.9], [-0.7, 0.9], [0.7, -0.9], [-0.7, -0.9]] as const) {
    const wheel = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), mat('#2a72c9'), x, 0.55, z);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }
  return g;
}

function kiwiSign(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mat('#9aa0a6', { metalness: 0.6 }), 0, 1.2, 0));
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshStandardMaterial({ map: kiwiSignTexture(), transparent: true, side: THREE.DoubleSide }),
  );
  sign.position.y = 2.4;
  g.add(sign);
  return g;
}

function fenceSegment(rng: Rng): THREE.Object3D {
  // Number 8 wire fence: posts and three strands.
  const g = new THREE.Group();
  for (const x of [-2, 0, 2]) g.add(mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), mat('#7a6146'), x, 0.65, 0));
  for (const y of [0.4, 0.75, 1.1]) g.add(mesh(new THREE.BoxGeometry(4, 0.03, 0.03), mat('#aab0b5', { metalness: 0.7 }), 0, y, 0));
  g.rotation.y = rng() * Math.PI;
  return g;
}

export const props = new Registry<PropDef>('prop')
  .register('pohutukawa', { build: pohutukawa, collider: 1.0, count: 26, band: [22, 85] })
  .register('ponga', { build: ponga, collider: 0.5, count: 34, band: [16, 88] })
  .register('cabbageTree', { build: cabbageTree, collider: 0.4, count: 22, band: [14, 85] })
  .register('flax', { build: flaxBush, collider: 0, count: 40, band: [10, 88] })
  .register('sheep', { build: sheep, collider: 0.8, count: 14, band: [30, 80] })
  .register('fence', { build: fenceSegment, collider: 0, count: 12, band: [35, 80] })
  .register('kiwiSign', { build: kiwiSign, collider: 0.2, count: 6, band: [12, 40] })
  .register('bach', { build: bach, collider: 4.6, count: 1, fixed: [[-34, 26, 0.6]] })
  .register('giantBottle', { build: giantBottle, collider: 1.6, count: 1, fixed: [[40, -22, 0]] })
  .register('giantCarrot', { build: giantCarrot, collider: 1.4, count: 1, fixed: [[-30, -42, 0]] })
  .register('giantGumboot', { build: giantGumboot, collider: 2.4, count: 1, fixed: [[46, 34, -0.8]] })
  .register('buzzyBee', { build: buzzyBee, collider: 1.6, count: 1, fixed: [[16, 30, 2.2]] });
