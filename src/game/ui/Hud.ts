import type { Weapon } from '../weapons/Weapon';

export interface HudState {
  health: number;
  maxHealth: number;
  nest: number;
  nestMax: number;
  wave: number;
  totalWaves: number;
  enemiesLeft: number;
  score: number;
  weapon: Weapon;
  weaponSlot: number;
  hurt: number;
}

export interface RadarBlip {
  dx: number; // world-space offset from player
  dz: number;
  color: string;
  size: number;
}

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

/** DOM heads-up display. Pure presentation: it never touches game state. */
export class Hud {
  private readonly root = $('hud');
  private readonly health = $('hp-fill');
  private readonly healthText = $('hp-text');
  private readonly nest = $('nest-fill');
  private readonly nestText = $('nest-text');
  private readonly wave = $('wave');
  private readonly left = $('left');
  private readonly score = $('score');
  private readonly weaponName = $('weapon-name');
  private readonly ammo = $('ammo');
  private readonly reload = $('reload-fill');
  private readonly vignette = $('vignette');
  private readonly toasts = $('toasts');
  private readonly banner = $('banner');
  private readonly slots = $('slots');
  private readonly radar = $<HTMLCanvasElement>('radar');
  private bannerTimer = 0;
  private hitTimer = 0;

  show(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }

  buildSlots(weapons: Weapon[]): void {
    this.slots.innerHTML = '';
    weapons.forEach((w, i) => {
      const el = document.createElement('div');
      el.className = 'slot';
      el.textContent = `${i + 1} ${w.stats.name}`;
      this.slots.appendChild(el);
    });
  }

  update(s: HudState, dt: number): void {
    this.health.style.width = `${(s.health / s.maxHealth) * 100}%`;
    this.healthText.textContent = String(Math.ceil(s.health));
    this.nest.style.width = `${(s.nest / s.nestMax) * 100}%`;
    this.nestText.textContent = `${Math.ceil(s.nest)}%`;
    this.nest.classList.toggle('danger', s.nest / s.nestMax < 0.35);
    this.wave.textContent = s.wave > 0 ? `Wave ${s.wave}/${s.totalWaves}` : 'Get ready';
    this.left.textContent = `${s.enemiesLeft} pests`;
    this.score.textContent = s.score.toLocaleString('en-NZ');
    this.weaponName.textContent = s.weapon.stats.name;
    this.ammo.textContent = `${s.weapon.ammo} / ${s.weapon.reserve}`;
    this.ammo.classList.toggle('empty', s.weapon.ammo === 0);
    this.reload.style.width = `${s.weapon.reloadProgress * 100}%`;
    this.vignette.style.opacity = String(Math.min(1, s.hurt * 2.5 + (s.health < 30 ? 0.35 : 0)));
    [...this.slots.children].forEach((el, i) => el.classList.toggle('active', i === s.weaponSlot));

    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) this.banner.classList.remove('visible');
    this.hitTimer -= dt;
    document.body.classList.toggle('hitmarker', this.hitTimer > 0);
  }

  hitMarker(): void {
    this.hitTimer = 0.12;
  }

  toast(text: string, kind = ''): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.prepend(el);
    setTimeout(() => el.remove(), 2600);
    while (this.toasts.children.length > 5) this.toasts.lastElementChild?.remove();
  }

  showBanner(title: string, subtitle: string, seconds = 2.8): void {
    this.banner.innerHTML = '';
    const h = document.createElement('h2');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = subtitle;
    this.banner.append(h, p);
    this.banner.classList.add('visible');
    this.bannerTimer = seconds;
  }

  /** Top-down radar, rotated so "up" is the way the player faces. */
  drawRadar(yaw: number, blips: RadarBlip[], range = 60): void {
    const ctx = this.radar.getContext('2d');
    if (!ctx) return;
    const size = this.radar.width;
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(8, 28, 16, 0.55)';
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(207, 232, 214, 0.35)';
    ctx.lineWidth = 1;
    for (const r of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(half, half, (half - 3) * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (const b of blips) {
      // Rotate world offset into view space: forward (-Z rotated by yaw) maps to screen up.
      const rx = b.dx * cos - b.dz * sin;
      const rz = b.dx * sin + b.dz * cos;
      const dist = Math.hypot(rx, rz);
      const k = dist > range ? range / dist : 1;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(half + (rx * k * (half - 6)) / range, half + (rz * k * (half - 6)) / range, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(half, half - 6);
    ctx.lineTo(half - 4, half + 4);
    ctx.lineTo(half + 4, half + 4);
    ctx.fill();
  }
}
