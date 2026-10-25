import * as THREE from 'three';
import { CONFIG } from './config';
import { EventBus } from './core/EventBus';
import type { GameEvents } from './events';
import { World } from './world/World';
import { Player } from './player/Player';
import { Input } from './player/Input';
import { EnemyManager } from './enemies/EnemyManager';
import { WeaponSystem } from './weapons/WeaponSystem';
import { ProjectileSystem } from './combat/ProjectileSystem';
import { Effects } from './fx/Effects';
import { PickupManager } from './pickups/PickupManager';
import type { PickupTarget } from './pickups/registry';
import { WaveSpawner, planWave, totalEnemies } from './waves/WaveDirector';
import { Sfx } from './audio/Sfx';
import { Radio } from './audio/Radio';
import { Hud } from './ui/Hud';
import { Screens } from './ui/Screens';
import { wireFeedback } from './feedback';
import { spawnPoint, intermissionDrops } from './spawning';

type Phase = 'title' | 'intermission' | 'combat' | 'paused' | 'over';

/**
 * Composition root and main loop. Systems are created here and talk to each
 * other through the event bus; per-phase behaviour lives in `phaseUpdate`.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.05, 900);
  readonly renderer: THREE.WebGLRenderer;
  readonly world: World;
  readonly player: Player;
  readonly input: Input;
  readonly enemies: EnemyManager;
  readonly weapons: WeaponSystem;
  readonly projectiles: ProjectileSystem;
  readonly fx: Effects;
  readonly pickups: PickupManager;
  readonly sfx = new Sfx();
  readonly radio: Radio;
  readonly hud = new Hud();
  readonly screens: Screens;

  phase: Phase = 'title';
  private resumePhase: Phase = 'intermission';
  wave = 0;
  score = 0;
  nestHealth: number = CONFIG.nest.maxHealth;
  private spawner: WaveSpawner | null = null;
  private phaseTimer = 0;
  private elapsed = 0;
  private lastTime = performance.now();
  private triggerWasDown = false;
  private ambientTimer = 4;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.add(this.camera);

    this.world = new World(this.scene);
    this.input = new Input(canvas);
    this.player = new Player(this.camera, this.world);
    this.enemies = new EnemyManager(this.scene, this.events);
    this.fx = new Effects(this.scene);
    this.projectiles = new ProjectileSystem(this.scene, this.enemies, (x, z) => this.world.heightAt(x, z));
    this.weapons = new WeaponSystem(this.camera, this.events);
    this.pickups = new PickupManager(this.scene, this.events);
    this.radio = new Radio(this.sfx);
    this.hud.buildSlots(this.weapons.weapons);
    this.screens = new Screens({
      start: () => this.start(),
      resume: () => this.resume(),
      restart: () => this.start(),
      toggleMute: () => this.toggleMute(),
    });
    wireFeedback(this);

    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.isActive()) this.pause();
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.screens.show('title');
    this.hud.show(false);
    requestAnimationFrame((t) => this.frame(t));
  }

  get pickupTarget(): PickupTarget {
    return {
      healPlayer: (n) => this.player.health < CONFIG.player.maxHealth && (this.player.heal(n), true),
      repairNest: (n) => this.nestHealth < CONFIG.nest.maxHealth && ((this.nestHealth = Math.min(CONFIG.nest.maxHealth, this.nestHealth + n)), true),
      refillAmmo: (f) => this.weapons.weapons.some((w) => w.reserve < w.stats.reserveMax) && (this.weapons.refillAll(f), true),
    };
  }

  start(): void {
    this.sfx.unlock();
    this.enemies.clear();
    this.projectiles.clear();
    this.pickups.clear();
    this.fx.clear();
    this.player.reset();
    this.weapons.resetAll();
    this.wave = 0;
    this.score = 0;
    this.nestHealth = CONFIG.nest.maxHealth;
    this.spawner = null;
    this.enterIntermission(5);
    this.screens.show('none');
    this.hud.show(true);
    this.hud.showBanner('Kia ora, ranger', 'Protect the kiwi burrow from introduced pests', 4.5);
    this.radio.say('intro', 3);
    this.sfx.play('kiwiCall');
    this.input.lock();
  }

  pause(): void {
    if (!this.isActive()) return;
    this.resumePhase = this.phase;
    this.phase = 'paused';
    this.input.reset();
    this.screens.show('pause');
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = this.resumePhase;
    this.screens.show('none');
    this.lastTime = performance.now();
    this.input.lock();
  }

  addScore(points: number): void {
    this.score += points;
  }

  damageNest(amount: number): void {
    this.nestHealth = Math.max(0, this.nestHealth - amount);
  }

  private toggleMute(): boolean {
    const muted = !this.sfx.muted;
    this.sfx.setMuted(muted);
    this.radio.setMuted(muted);
    return muted;
  }

  private isActive(): boolean {
    return this.phase === 'combat' || this.phase === 'intermission';
  }

  private enterIntermission(seconds: number): void {
    this.phase = 'intermission';
    this.phaseTimer = seconds;
  }

  private startNextWave(): void {
    this.wave++;
    const plan = planWave(this.wave);
    this.spawner = new WaveSpawner(plan);
    this.phase = 'combat';
    this.events.emit('waveStarted', { wave: this.wave, total: CONFIG.waves.total, boss: plan.boss });
  }

  private endGame(won: boolean, headline: string, detail: string, line: string): void {
    this.phase = 'over';
    this.radio.say(line, 5);
    this.input.unlock();
    this.hud.show(false);
    this.screens.showEnd(won, headline, detail, this.score);
  }

  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;
    this.phaseUpdate[this.phase](dt);
    this.world.update(dt, this.elapsed);
    this.world.setNestDamageGlow(1 - this.nestHealth / CONFIG.nest.maxHealth);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t) => this.frame(t));
  }

  private readonly phaseUpdate: Record<Phase, (dt: number) => void> = {
    title: (dt) => this.attractMode(dt),
    paused: () => undefined,
    over: (dt) => this.attractMode(dt),
    intermission: (dt) => {
      this.simulate(dt);
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.startNextWave();
    },
    combat: (dt) => {
      this.simulate(dt);
      for (const typeId of this.spawner?.tick(dt) ?? []) this.spawnEnemy(typeId);
      this.checkWaveOutcome();
    },
  };

  /** Slow orbit around the nest behind the menus. */
  private attractMode(dt: number): void {
    const a = this.elapsed * 0.08;
    const r = 11; // inside the tree line so the camera never clips foliage
    this.camera.position.set(Math.sin(a) * r, this.world.heightAt(Math.sin(a) * r, Math.cos(a) * r) + 5, Math.cos(a) * r);
    this.camera.lookAt(0, 2, 0);
    this.enemies.update(this.behaviourContext(dt));
    this.fx.update(dt);
  }

  private simulate(dt: number): void {
    this.player.update(dt, this.input);
    this.handleWeaponInput();
    const moving = this.player.velocity.lengthSq() > 1;
    this.weapons.update(dt, moving);
    this.enemies.update(this.behaviourContext(dt));
    this.projectiles.update(dt);
    this.pickups.update(dt, this.player.position, this.pickupTarget);
    this.fx.update(dt);
    this.ambience(dt);
    this.updateHud(dt);
    if (this.player.health <= 0) this.endGame(false, 'Ranger down', 'Yeah, nah. The pests got you this time.', 'lostPlayer');
    else if (this.nestHealth <= 0) this.endGame(false, 'The nest is gone', 'Gutted. The kiwi eggs didn’t make it.', 'lostNest');
  }

  private handleWeaponInput(): void {
    const input = this.input;
    for (let i = 0; i < this.weapons.weapons.length; i++) if (input.consumePress(`Digit${i + 1}`)) this.weapons.select(i);
    const wheel = input.takeWheel();
    if (wheel !== 0) this.weapons.cycle(wheel);
    if (input.consumePress('KeyQ')) this.weapons.cycle(1);
    if (input.consumePress('KeyR')) this.weapons.reload();
    if (input.consumePress('KeyM')) this.toggleMute();
    if (input.consumePress('KeyP')) this.input.unlock();

    const down = input.mouseDown && input.locked;
    const pressed = down && !this.triggerWasDown;
    this.triggerWasDown = down;
    if (!down) return;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const kick = this.weapons.trigger(
      {
        origin: this.camera.position.clone(),
        direction,
        enemies: this.enemies,
        projectiles: this.projectiles,
        fx: this.fx,
        events: this.events,
        heightAt: (x, z) => this.world.heightAt(x, z),
        muzzle: this.weapons.muzzleWorld,
      },
      pressed,
    );
    this.player.pitch = Math.min(1.45, this.player.pitch + kick);
  }

  private spawnEnemy(typeId: string): void {
    const p = spawnPoint(this.player.position, Math.random);
    this.enemies.spawn(typeId, p.x, p.z, this.world.heightAt(p.x, p.z));
  }

  private checkWaveOutcome(): void {
    if (!this.spawner || this.spawner.remaining > 0 || this.enemies.count > 0) return;
    this.events.emit('waveCleared', { wave: this.wave });
    if (this.wave >= CONFIG.waves.total) {
      this.endGame(true, 'Predator free!', 'Absolute legend. The kiwi reckon you’re choice.', 'victory');
      return;
    }
    for (const drop of intermissionDrops(Math.random)) {
      this.pickups.spawn(drop.id, drop.x, this.world.heightAt(drop.x, drop.z), drop.z);
    }
    this.enterIntermission(CONFIG.waves.breakSeconds);
  }

  private ambience(dt: number): void {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 3 + Math.random() * 6;
    this.sfx.play(Math.random() < 0.15 ? 'kiwiCall' : 'tui', 0.9 + Math.random() * 0.25);
  }

  private behaviourContext(dt: number) {
    return {
      dt,
      elapsed: this.elapsed,
      player: this.player.position,
      nest: this.world.nestPosition,
      heightAt: (x: number, z: number) => this.world.heightAt(x, z),
    };
  }

  private updateHud(dt: number): void {
    const remaining = (this.spawner?.remaining ?? 0) + this.enemies.count;
    this.hud.update(
      {
        health: this.player.health,
        maxHealth: CONFIG.player.maxHealth,
        nest: this.nestHealth,
        nestMax: CONFIG.nest.maxHealth,
        wave: this.wave,
        totalWaves: CONFIG.waves.total,
        enemiesLeft: this.phase === 'combat' ? remaining : this.spawner ? 0 : totalEnemies(planWave(1)),
        score: this.score,
        weapon: this.weapons.current,
        weaponSlot: this.weapons.weapons.indexOf(this.weapons.current),
        hurt: this.player.hurtTimer,
      },
      dt,
    );
    const p = this.player.position;
    const blips = this.enemies.active.map((e) => ({
      dx: e.position.x - p.x,
      dz: e.position.z - p.z,
      color: e.def.radar?.color ?? '#ff8a5c',
      size: e.def.radar?.size ?? 2.5,
    }));
    blips.push({ dx: -p.x, dz: -p.z, color: '#7fffb0', size: 4 });
    this.hud.drawRadar(this.player.yaw, blips);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
