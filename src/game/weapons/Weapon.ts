import type * as THREE from 'three';
import type { FireContext } from '../combat/types';

export type FireResult = 'fired' | 'empty' | 'busy';

export interface WeaponStats {
  name: string;
  /** One-line flavour shown on the HUD when switching. */
  blurb: string;
  magSize: number;
  reserveMax: number;
  fireInterval: number;
  reloadTime: number;
  automatic: boolean;
  /** Camera kick in radians per shot. */
  recoil: number;
}

/**
 * Template Method base for every weapon. The base class owns the fire/reload
 * workflow (cooldowns, ammo, auto-reload); subclasses only implement what a
 * shot does (`onFire`) and what the gun looks like (`buildViewModel`).
 */
export abstract class Weapon {
  ammo: number;
  reserve: number;
  private cooldown = 0;
  private reloadTimer = 0;

  constructor(
    readonly id: string,
    readonly stats: WeaponStats,
  ) {
    this.ammo = stats.magSize;
    this.reserve = stats.reserveMax;
  }

  get reloading(): boolean {
    return this.reloadTimer > 0;
  }

  /** 0..1 progress through the current reload, or 0 when idle. */
  get reloadProgress(): number {
    return this.reloading ? 1 - this.reloadTimer / this.stats.reloadTime : 0;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.reloading) return;
    this.reloadTimer -= dt;
    if (this.reloadTimer <= 0) this.finishReload();
  }

  /**
   * Attempts a shot. `pressed` is true only on the frame the trigger went down;
   * semi-automatic weapons ignore a held trigger.
   */
  tryFire(ctx: FireContext, pressed: boolean): FireResult {
    if (!this.stats.automatic && !pressed) return 'busy';
    if (this.cooldown > 0 || this.reloading) return 'busy';
    if (this.ammo <= 0) {
      if (!this.startReload()) this.cooldown = 0.3;
      return 'empty';
    }
    this.ammo--;
    this.cooldown = this.stats.fireInterval;
    this.onFire(ctx);
    if (this.ammo === 0) this.startReload();
    return 'fired';
  }

  startReload(): boolean {
    if (this.reloading || this.ammo >= this.stats.magSize || this.reserve <= 0) return false;
    this.reloadTimer = this.stats.reloadTime;
    return true;
  }

  cancelReload(): void {
    this.reloadTimer = 0;
  }

  addReserve(amount: number): void {
    this.reserve = Math.min(this.stats.reserveMax, this.reserve + amount);
  }

  resetAmmo(): void {
    this.ammo = this.stats.magSize;
    this.reserve = this.stats.reserveMax;
    this.cooldown = 0;
    this.reloadTimer = 0;
  }

  /** Hook: what a single shot does. */
  protected abstract onFire(ctx: FireContext): void;

  /** Hook: first-person model, positioned relative to the camera. */
  abstract buildViewModel(): THREE.Object3D;

  private finishReload(): void {
    this.reloadTimer = 0;
    const take = Math.min(this.stats.magSize - this.ammo, this.reserve);
    this.ammo += take;
    this.reserve -= take;
  }
}
