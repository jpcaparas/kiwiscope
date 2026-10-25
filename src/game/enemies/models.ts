import * as THREE from 'three';
import { mat, mesh } from '../world/materials';

/**
 * Low-poly predator models built from primitives. Each faces +Z so the
 * manager can rotate them by heading.
 */
function eyes(g: THREE.Group, y: number, z: number, spread: number, size: number, color = '#ffdd33'): void {
  const eye = mat(color, { emissive: color, emissiveIntensity: 0.9 });
  for (const x of [-spread, spread]) g.add(mesh(new THREE.SphereGeometry(size, 6, 4), eye, x, y, z));
}

export function possumModel(scale = 1): THREE.Object3D {
  const g = new THREE.Group();
  const fur = mat('#5d5550');
  const body = mesh(new THREE.SphereGeometry(0.55, 10, 8), fur, 0, 0.55, 0);
  body.scale.set(0.9, 0.85, 1.3);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.33, 10, 8), fur, 0, 0.8, 0.65));
  g.add(mesh(new THREE.ConeGeometry(0.16, 0.3, 6), mat('#f2c6c0'), 0, 0.72, 0.98).rotateX(Math.PI / 2));
  for (const x of [-0.22, 0.22]) g.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), fur, x, 1.08, 0.58));
  eyes(g, 0.86, 0.92, 0.13, 0.07, '#ff5533');
  const tail = mesh(new THREE.CylinderGeometry(0.12, 0.05, 1.1, 6), mat('#2f2a27'), 0, 0.6, -0.95);
  tail.rotation.x = -1.0;
  g.add(tail);
  for (const [x, z] of [[0.3, 0.4], [-0.3, 0.4], [0.3, -0.4], [-0.3, -0.4]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 5), fur, x, 0.17, z));
  }
  g.scale.setScalar(scale);
  return g;
}

export function stoatModel(): THREE.Object3D {
  const g = new THREE.Group();
  const fur = mat('#8a5a32');
  const belly = mat('#efe2c4');
  const body = mesh(new THREE.CapsuleGeometry(0.2, 1.0, 4, 8), fur, 0, 0.35, 0);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.21, 8, 6), belly, 0, 0.3, 0.55));
  g.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), fur, 0, 0.45, 0.78));
  eyes(g, 0.5, 0.95, 0.09, 0.05, '#ff3322');
  const tail = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), fur, 0, 0.4, -0.85);
  tail.rotation.x = -1.2;
  g.add(tail);
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), mat('#111'), 0, 0.6, -1.08)); // black tail tip
  return g;
}

export function ratModel(): THREE.Object3D {
  const g = new THREE.Group();
  const fur = mat('#3e3a36');
  const body = mesh(new THREE.SphereGeometry(0.3, 8, 6), fur, 0, 0.26, 0);
  body.scale.set(0.9, 0.8, 1.4);
  g.add(body);
  g.add(mesh(new THREE.ConeGeometry(0.17, 0.4, 6), fur, 0, 0.3, 0.55).rotateX(Math.PI / 2));
  for (const x of [-0.12, 0.12]) g.add(mesh(new THREE.CircleGeometry(0.09, 8), mat('#d9a3a0', { side: THREE.DoubleSide }), x, 0.48, 0.38));
  eyes(g, 0.38, 0.6, 0.08, 0.04, '#ff2222');
  const tail = mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.9, 4), mat('#d9a3a0'), 0, 0.2, -0.75);
  tail.rotation.x = -1.35;
  g.add(tail);
  return g;
}

export function waspModel(): THREE.Object3D {
  const g = new THREE.Group();
  const yellow = mat('#f2c014', { emissive: '#402e00' });
  const black = mat('#111');
  const abdomen = mesh(new THREE.SphereGeometry(0.22, 8, 6), yellow, 0, 0, -0.25);
  abdomen.scale.z = 1.6;
  g.add(abdomen);
  for (const z of [-0.18, -0.36]) {
    const band = mesh(new THREE.TorusGeometry(0.2, 0.05, 5, 12), black, 0, 0, z);
    g.add(band);
  }
  g.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), black, 0, 0, 0.08));
  g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), yellow, 0, 0, 0.27));
  eyes(g, 0.05, 0.36, 0.07, 0.05, '#ff3300');
  const wingMat = new THREE.MeshBasicMaterial({ color: '#dfefff', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (const x of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), wingMat);
    wing.position.set(x * 0.28, 0.14, 0.02);
    wing.name = 'wing';
    g.add(wing);
  }
  return g;
}
