import * as THREE from 'three';
import type { FxSink } from '../combat/types';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface Fader {
  object: THREE.Mesh | THREE.Line;
  life: number;
  maxLife: number;
  grow: number;
}

const PARTICLE_GEO = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const MAX_PARTICLES = 400;

/** Short-lived visual effects. All are pooled or self-disposing. */
export class Effects implements FxSink {
  private readonly particles: Particle[] = [];
  private readonly faders: Fader[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  tracer(from: THREE.Vector3, to: THREE.Vector3, color: string): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.faders.push({ object: line, life: 0.07, maxLife: 0.07, grow: 0 });
  }

  puff(at: THREE.Vector3, color: string, count = 8, speed = 4): void {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.removeParticle(0);
      const mesh = new THREE.Mesh(PARTICLE_GEO, material);
      mesh.position.copy(at);
      const velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).multiplyScalar(speed);
      const life = 0.4 + Math.random() * 0.4;
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life, maxLife: life });
    }
  }

  blast(at: THREE.Vector3, radius: number): void {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.7 }),
    );
    sphere.position.copy(at);
    this.scene.add(sphere);
    this.faders.push({ object: sphere, life: 0.35, maxLife: 0.35, grow: radius });
    this.puff(at, '#f4d21f', 14, 9);
    this.puff(at, '#1f5fa8', 10, 7);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) this.stepParticle(i, dt);
    for (let i = this.faders.length - 1; i >= 0; i--) this.stepFader(i, dt);
  }

  clear(): void {
    while (this.particles.length) this.removeParticle(0);
    while (this.faders.length) this.removeFader(0);
  }

  private stepParticle(i: number, dt: number): void {
    const p = this.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      this.removeParticle(i);
      return;
    }
    p.velocity.y -= 12 * dt;
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
  }

  private stepFader(i: number, dt: number): void {
    const f = this.faders[i];
    f.life -= dt;
    if (f.life <= 0) {
      this.removeFader(i);
      return;
    }
    const t = f.life / f.maxLife;
    (f.object.material as THREE.Material & { opacity: number }).opacity = t * 0.9;
    if (f.grow > 0) f.object.scale.setScalar(f.grow * (1 - t * t));
  }

  private removeParticle(i: number): void {
    const [p] = this.particles.splice(i, 1);
    this.scene.remove(p.mesh);
    // Puff materials are shared per burst; dispose when the burst's last particle dies.
    if (!this.particles.some((o) => o.mesh.material === p.mesh.material)) (p.mesh.material as THREE.Material).dispose();
  }

  private removeFader(i: number): void {
    const [f] = this.faders.splice(i, 1);
    this.scene.remove(f.object);
    f.object.geometry.dispose();
    (f.object.material as THREE.Material).dispose();
  }
}
