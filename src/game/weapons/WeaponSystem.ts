import * as THREE from 'three';
import type { Weapon } from './Weapon';
import { weaponFactories } from './registry';
import type { FireContext } from '../combat/types';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../events';

/** Holds the player's arsenal, handles switching and animates the viewmodel. */
export class WeaponSystem {
  readonly weapons: Weapon[];
  private index = 0;
  private readonly holder = new THREE.Group();
  private readonly models: THREE.Object3D[];
  private readonly flash: THREE.PointLight;
  private kick = 0;
  private switchAnim = 0;
  private sway = 0;

  constructor(
    camera: THREE.Camera,
    private readonly events: EventBus<GameEvents>,
  ) {
    this.weapons = weaponFactories.values().map((make) => make());
    this.models = this.weapons.map((w) => w.buildViewModel());
    for (const m of this.models) {
      m.visible = false;
      this.holder.add(m);
    }
    this.flash = new THREE.PointLight('#ffdc8a', 0, 6);
    this.flash.position.set(0, 0.05, -0.6);
    this.holder.add(this.flash);
    this.holder.position.set(0.3, -0.3, -0.62);
    this.holder.scale.setScalar(0.6);
    camera.add(this.holder);
    this.select(0, true);
  }

  get current(): Weapon {
    return this.weapons[this.index];
  }

  get muzzleWorld(): THREE.Vector3 {
    return this.flash.getWorldPosition(new THREE.Vector3());
  }

  select(i: number, silent = false): void {
    if (i < 0 || i >= this.weapons.length || (i === this.index && !silent)) return;
    this.current.cancelReload();
    this.models[this.index].visible = false;
    this.index = i;
    this.models[i].visible = true;
    this.switchAnim = 1;
    if (!silent) this.events.emit('weaponSwitched', { weaponId: this.current.id, name: this.current.stats.name });
  }

  cycle(step: number): void {
    const n = this.weapons.length;
    this.select((this.index + step + n) % n);
  }

  /** Returns camera pitch kick (radians) to apply this frame. */
  trigger(ctx: FireContext, pressed: boolean): number {
    if (this.switchAnim > 0.4) return 0;
    const w = this.current;
    const result = w.tryFire(ctx, pressed);
    if (result === 'empty' && pressed) this.events.emit(w.reloading ? 'reloadStarted' : 'dryFire', { weaponId: w.id });
    if (result !== 'fired') return 0;
    this.kick = 1;
    this.flash.intensity = 6;
    this.events.emit('weaponFired', { weaponId: w.id });
    if (w.reloading) this.events.emit('reloadStarted', { weaponId: w.id });
    return w.stats.recoil;
  }

  reload(): void {
    if (this.current.startReload()) this.events.emit('reloadStarted', { weaponId: this.current.id });
  }

  refillAll(fraction: number): void {
    for (const w of this.weapons) w.addReserve(Math.ceil(w.stats.reserveMax * fraction));
  }

  resetAll(): void {
    for (const w of this.weapons) w.resetAmmo();
    this.select(0, true);
  }

  update(dt: number, moving: boolean): void {
    for (const w of this.weapons) w.update(dt);
    this.kick = Math.max(0, this.kick - dt * 9);
    this.switchAnim = Math.max(0, this.switchAnim - dt * 4);
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 60);
    if (moving) this.sway += dt * 9;

    const model = this.models[this.index];
    const reload = this.current.reloadProgress;
    const reloadDip = reload > 0 ? Math.sin(reload * Math.PI) : 0;
    model.position.set(Math.sin(this.sway) * 0.012, -this.switchAnim * 0.35 - reloadDip * 0.18 + Math.abs(Math.cos(this.sway)) * 0.01, this.kick * 0.07);
    model.rotation.set(this.kick * 0.25 + reloadDip * 0.6, 0, reloadDip * 0.3);
  }
}
