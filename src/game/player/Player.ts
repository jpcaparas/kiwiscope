import * as THREE from 'three';
import { CONFIG } from '../config';
import { clamp } from '../core/math';
import type { Input } from './Input';
import type { World } from '../world/World';
import { resolveCollisions } from './collision';

const P = CONFIG.player;

/** First-person controller: WASD + mouse look, sprint, jump, terrain following. */
export class Player {
  readonly position = new THREE.Vector3(0, 0, 8); // feet
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  health: number = P.maxHealth;
  private grounded = true;
  private bobPhase = 0;
  /** Seconds remaining of red damage flash; read by the HUD. */
  hurtTimer = 0;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly world: World,
  ) {
    this.reset();
  }

  reset(): void {
    this.position.set(0, this.world.heightAt(0, 8), 8);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.health = P.maxHealth;
    this.hurtTimer = 0;
    this.syncCamera();
  }

  get alive(): boolean {
    return this.health > 0;
  }

  get eye(): THREE.Vector3 {
    return this.camera.position;
  }

  damage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.35;
  }

  heal(amount: number): void {
    this.health = Math.min(P.maxHealth, this.health + amount);
  }

  update(dt: number, input: Input): void {
    this.look(input);
    this.move(dt, input);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.syncCamera();
  }

  private look(input: Input): void {
    const { dx, dy } = input.takeMouseDelta();
    this.yaw -= dx * P.lookSensitivity;
    this.pitch = clamp(this.pitch - dy * P.lookSensitivity, -1.45, 1.45);
  }

  private move(dt: number, input: Input): void {
    const forward = Number(input.isDown('KeyW') || input.isDown('ArrowUp')) - Number(input.isDown('KeyS') || input.isDown('ArrowDown'));
    const strafe = Number(input.isDown('KeyD') || input.isDown('ArrowRight')) - Number(input.isDown('KeyA') || input.isDown('ArrowLeft'));
    const speed = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? P.sprintSpeed : P.walkSpeed;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let mx = -sin * forward + cos * strafe;
    let mz = -cos * forward - sin * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
    }
    // Snappy on the ground, floaty in the air.
    const accel = this.grounded ? 14 : 3;
    this.velocity.x += (mx * speed - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (mz * speed - this.velocity.z) * Math.min(1, accel * dt);

    if (this.grounded && input.consumePress('Space')) {
      this.velocity.y = P.jumpSpeed;
      this.grounded = false;
    }
    this.velocity.y -= P.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);
    resolveCollisions(this.position, P.radius, this.world.colliders, CONFIG.arenaRadius);

    const ground = this.world.heightAt(this.position.x, this.position.z);
    if (this.position.y <= ground) {
      this.position.y = ground;
      this.velocity.y = 0;
      this.grounded = true;
    }
    if (this.grounded && len > 0) this.bobPhase += dt * speed * 1.4;
  }

  private syncCamera(): void {
    const bob = Math.sin(this.bobPhase) * 0.05;
    this.camera.position.set(this.position.x, this.position.y + P.eyeHeight + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
