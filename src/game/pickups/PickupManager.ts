import * as THREE from 'three';
import { pickups, type PickupTarget } from './registry';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../events';

interface LivePickup {
  id: string;
  object: THREE.Object3D;
  baseY: number;
  age: number;
}

const COLLECT_RADIUS = 1.6;
const LIFETIME = 30;

/** Spawns bobbing pickups and applies them when the player walks over them. */
export class PickupManager {
  private readonly live: LivePickup[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly events: EventBus<GameEvents>,
  ) {}

  spawn(id: string, x: number, groundY: number, z: number): void {
    const object = pickups.get(id).build();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.025, 6, 24),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.45;
    object.add(ring);
    object.position.set(x, groundY + 0.7, z);
    this.scene.add(object);
    this.live.push({ id, object, baseY: groundY + 0.7, age: 0 });
  }

  update(dt: number, playerFeet: THREE.Vector3, target: PickupTarget): void {
    for (const p of [...this.live]) {
      p.age += dt;
      p.object.rotation.y += dt * 2;
      p.object.position.y = p.baseY + Math.sin(p.age * 3) * 0.12;
      const near = Math.hypot(p.object.position.x - playerFeet.x, p.object.position.z - playerFeet.z) < COLLECT_RADIUS;
      if (near && Math.abs(playerFeet.y - p.baseY) < 3 && pickups.get(p.id).apply(target)) {
        this.events.emit('pickupCollected', { id: p.id, label: pickups.get(p.id).label });
        this.remove(p);
      } else if (p.age > LIFETIME) {
        this.remove(p);
      }
    }
  }

  clear(): void {
    for (const p of [...this.live]) this.remove(p);
  }

  private remove(p: LivePickup): void {
    this.live.splice(this.live.indexOf(p), 1);
    this.scene.remove(p.object);
  }
}
