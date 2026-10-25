import * as THREE from 'three';

/** Shared, cached flat-shaded materials keyed by colour to keep draw state small. */
const cache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${JSON.stringify(opts)}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...opts });
    cache.set(key, m);
  }
  return m;
}

/** Mesh helper that also turns on shadows. */
export function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
