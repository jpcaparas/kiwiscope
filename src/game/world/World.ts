import * as THREE from 'three';
import { CONFIG } from '../config';
import { createRng, range, type Rng } from '../core/rng';
import { heightAt } from './terrain';
import { props, type PropDef } from './props';
import { grassTexture } from './textures';
import { mat, mesh } from './materials';
import { buildNest } from './nest';

/** A circular obstacle the player can't walk through. */
export interface Collider {
  x: number;
  z: number;
  r: number;
}

/**
 * Builds and owns the static scene: sky, lighting, terrain, scenery and the
 * kiwi nest. Gameplay systems read terrain height and colliders from here.
 */
export class World {
  readonly colliders: Collider[] = [];
  readonly nestPosition = new THREE.Vector3(0, heightAt(0, 0), 0);
  readonly sun: THREE.DirectionalLight;
  private readonly nest: ReturnType<typeof buildNest>;

  constructor(readonly scene: THREE.Scene) {
    const rng = createRng(CONFIG.worldSeed);
    this.sun = this.addSkyAndLight();
    this.addTerrain();
    this.addDistantPeaks(rng);
    this.scatterProps(rng);
    this.addGrassTufts(rng);
    this.nest = buildNest();
    this.nest.group.position.copy(this.nestPosition);
    scene.add(this.nest.group);
    this.colliders.push({ x: 0, z: 0, r: 1.6 });
  }

  heightAt(x: number, z: number): number {
    return heightAt(x, z);
  }

  /** Per-frame ambient animation (the kiwi guardian bobs about). */
  update(dt: number, elapsed: number): void {
    this.nest.animate(dt, elapsed);
  }

  setNestDamageGlow(fraction: number): void {
    this.nest.setDamage(fraction);
  }

  private addSkyAndLight(): THREE.DirectionalLight {
    const skyTop = new THREE.Color('#5aa6e0');
    const skyHorizon = new THREE.Color('#cfe6f2');
    this.scene.background = skyHorizon;
    this.scene.fog = new THREE.Fog(skyHorizon, 60, 210);

    const skyGeo = new THREE.SphereGeometry(400, 24, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: skyTop }, horizon: { value: skyHorizon } },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main(){ float h = clamp(normalize(vPos).y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, h), 1.0); }',
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Long white cloud, naturally.
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, fog: false });
    const cloud = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(8 + (i % 4) * 2, 8, 6), cloudMat);
      puff.position.set(-90 + i * 14, 120 + Math.sin(i) * 4, -180 + Math.cos(i * 1.7) * 6);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    this.scene.add(cloud);

    this.scene.add(new THREE.HemisphereLight('#dff1ff', '#3d5a2a', 1.1));
    const sun = new THREE.DirectionalLight('#fff4dc', 2.2);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = s.bottom = -70;
    s.right = s.top = 70;
    s.far = 260;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    return sun;
  }

  private addTerrain(): void {
    const size = 260;
    const geo = new THREE.PlaneGeometry(size, size, 160, 160);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private addDistantPeaks(rng: Rng): void {
    // A snow-capped volcanic cone on the horizon plus a ridge of alps.
    const rock = mat('#5f6b62');
    const snow = mat('#f4f7fa');
    const peak = (x: number, z: number, h: number, r: number): void => {
      const base = mesh(new THREE.ConeGeometry(r, h, 18), rock, x, h / 2 - 4, z);
      const cap = mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 18), snow, x, h - 4 - h * 0.16 + 0.2, z);
      this.scene.add(base, cap);
    };
    peak(-150, -170, 110, 90);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 9) * Math.PI * 0.7;
      peak(Math.cos(a) * 210, Math.sin(a) * 210, range(rng, 50, 90), range(rng, 45, 70));
    }
  }

  private scatterProps(rng: Rng): void {
    for (const def of props.values()) {
      if (def.fixed) this.placeFixed(def);
      else this.placeScattered(def, rng);
    }
  }

  private placeFixed(def: PropDef): void {
    for (const [x, z, rot] of def.fixed ?? []) this.place(def, def.build(createRng(x * 31 + z)), x, z, rot);
  }

  private placeScattered(def: PropDef, rng: Rng): void {
    const [minR, maxR] = def.band ?? [15, 85];
    let placed = 0;
    for (let attempt = 0; attempt < def.count * 20 && placed < def.count; attempt++) {
      const a = rng() * Math.PI * 2;
      const r = range(rng, minR, maxR);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (this.isCrowded(x, z, def.collider + 1.5)) continue;
      this.place(def, def.build(rng), x, z, rng() * Math.PI * 2);
      placed++;
    }
  }

  private isCrowded(x: number, z: number, r: number): boolean {
    return this.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r);
  }

  private place(def: PropDef, obj: THREE.Object3D, x: number, z: number, rotY: number): void {
    obj.position.set(x, heightAt(x, z) - 0.05, z);
    obj.rotation.y = rotY;
    this.scene.add(obj);
    if (def.collider > 0) this.colliders.push({ x, z, r: def.collider });
  }

  private addGrassTufts(rng: Rng): void {
    const count = 1800;
    const geo = new THREE.ConeGeometry(0.14, 0.4, 3);
    geo.translate(0, 0.2, 0);
    const tufts = new THREE.InstancedMesh(geo, mat('#5f9c3f'), count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = range(rng, 5, 100);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      q.setFromAxisAngle(new THREE.Vector3(rng() - 0.5, 1, rng() - 0.5).normalize(), rng());
      const k = range(rng, 0.5, 1.1);
      s.set(k, k, k);
      m.compose(new THREE.Vector3(x, heightAt(x, z), z), q, s);
      tufts.setMatrixAt(i, m);
    }
    tufts.receiveShadow = true;
    this.scene.add(tufts);
  }
}
