import * as THREE from 'three';
import { Weapon } from './Weapon';
import type { FireContext } from '../combat/types';
import { hitscan, spreadDirection } from '../combat/hitscan';
import { mat } from '../world/materials';

function vm(geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

/** Iridescent pāua-shell finish. */
function pauaMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#3fb8a0', emissive: '#2a4f7a', emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.25 });
}

/** Semi-auto, accurate sidearm inlaid with pāua shell. */
export class PauaPistol extends Weapon {
  constructor() {
    super('paua', {
      name: 'Pāua Pistol',
      blurb: 'Reliable as. Shell-inlaid and dead accurate.',
      magSize: 12,
      reserveMax: 96,
      fireInterval: 0.22,
      reloadTime: 1.1,
      automatic: false,
      recoil: 0.025,
    });
  }

  protected onFire(ctx: FireContext): void {
    hitscan(ctx, spreadDirection(ctx.direction, 0.004), 34, 140, '#7fffe0');
  }

  buildViewModel(): THREE.Object3D {
    const g = new THREE.Group();
    g.add(vm(new THREE.BoxGeometry(0.09, 0.12, 0.36), pauaMaterial(), 0, 0, -0.1));
    g.add(vm(new THREE.BoxGeometry(0.08, 0.2, 0.09), mat('#3a2a1e'), 0, -0.13, 0.03));
    g.add(vm(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8).rotateX(Math.PI / 2), mat('#bbbbbb', { metalness: 0.9 }), 0, 0.02, -0.33));
    return g;
  }
}

/** Kiwi ingenuity: a scattergun knocked together from Number 8 fencing wire. */
export class Number8Scattergun extends Weapon {
  constructor() {
    super('number8', {
      name: 'No. 8 Wire Scattergun',
      blurb: 'If it can be fixed with No. 8 wire, it can be fired from it.',
      magSize: 6,
      reserveMax: 36,
      fireInterval: 0.75,
      reloadTime: 1.6,
      automatic: false,
      recoil: 0.08,
    });
  }

  protected onFire(ctx: FireContext): void {
    for (let i = 0; i < 9; i++) hitscan(ctx, spreadDirection(ctx.direction, 0.075), 13, 45, '#ffd27a');
  }

  buildViewModel(): THREE.Object3D {
    const g = new THREE.Group();
    const wire = mat('#9aa3a8', { metalness: 0.9, roughness: 0.35 });
    for (const x of [-0.035, 0.035]) g.add(vm(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8).rotateX(Math.PI / 2), wire, x, 0.02, -0.25));
    g.add(vm(new THREE.BoxGeometry(0.12, 0.12, 0.3), mat('#6b4a2b'), 0, -0.04, 0.08));
    for (let i = 0; i < 5; i++) {
      const coil = vm(new THREE.TorusGeometry(0.06, 0.008, 4, 10), wire, 0, 0.02, -0.12 - i * 0.07);
      g.add(coil);
    }
    return g;
  }
}

/** Fully automatic, fires feijoas. Feijoa season never ends. */
export class FeijoaFlinger extends Weapon {
  constructor() {
    super('feijoa', {
      name: 'Feijoa Flinger',
      blurb: 'Full auto fruit. Smells amazing.',
      magSize: 40,
      reserveMax: 240,
      fireInterval: 0.085,
      reloadTime: 1.8,
      automatic: true,
      recoil: 0.012,
    });
  }

  protected onFire(ctx: FireContext): void {
    hitscan(ctx, spreadDirection(ctx.direction, 0.022), 11, 110, '#9be36b');
  }

  buildViewModel(): THREE.Object3D {
    const g = new THREE.Group();
    g.add(vm(new THREE.BoxGeometry(0.11, 0.13, 0.5), mat('#2f4a2a'), 0, 0, -0.15));
    const hopper = vm(new THREE.SphereGeometry(0.1, 10, 8), mat('#7fb24a'), 0, 0.13, -0.05);
    hopper.scale.set(1, 0.8, 1.4);
    g.add(hopper);
    g.add(vm(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8).rotateX(Math.PI / 2), mat('#222'), 0, 0.01, -0.48));
    return g;
  }
}

/** Lobs an explosive jandal (flip-flop). Splash damage, arcing flight. */
export class JandalLauncher extends Weapon {
  constructor() {
    super('jandal', {
      name: 'Jandal Launcher',
      blurb: 'Thwack. Area-of-effect footwear.',
      magSize: 4,
      reserveMax: 16,
      fireInterval: 0.9,
      reloadTime: 2.0,
      automatic: false,
      recoil: 0.06,
    });
  }

  protected onFire(ctx: FireContext): void {
    const object = buildJandal();
    object.position.copy(ctx.muzzle);
    const velocity = ctx.direction.clone().multiplyScalar(34);
    velocity.y += 3;
    ctx.projectiles.launch({
      position: object.position,
      velocity,
      gravity: 14,
      radius: 0.4,
      object,
      fuse: 4,
      onImpact: (at) => {
        ctx.enemies.explode(at, 4.5, 95);
        ctx.fx.blast(at, 4.5);
        ctx.events.emit('explosion', { position: at.clone(), radius: 4.5 });
      },
    });
  }

  buildViewModel(): THREE.Object3D {
    const g = new THREE.Group();
    g.add(vm(new THREE.CylinderGeometry(0.08, 0.09, 0.55, 10).rotateX(Math.PI / 2), mat('#1f5fa8'), 0, 0, -0.18));
    g.add(vm(new THREE.TorusGeometry(0.085, 0.015, 6, 14), mat('#f4d21f'), 0, 0, -0.46));
    g.add(vm(new THREE.BoxGeometry(0.06, 0.16, 0.08), mat('#333'), 0, -0.12, 0.0));
    return g;
  }
}

function buildJandal(): THREE.Object3D {
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), mat('#1f5fa8'));
  sole.scale.set(1, 1, 0.25); // flatten thickness; length ends up along Z after rotation
  sole.rotation.x = Math.PI / 2;
  g.add(sole);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 4, 10, Math.PI), mat('#f4d21f'));
  strap.position.y = 0.03;
  g.add(strap);
  return g;
}
