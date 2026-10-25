import type { Behaviour, BehaviourContext, EnemyState, TargetInfo } from './types';
import { CONFIG } from '../config';

const NEST_REACH = CONFIG.nest.radius;
const PLAYER_REACH = 1.6;

function nestTarget(ctx: BehaviourContext): TargetInfo {
  return { position: ctx.nest, kind: 'nest', reach: NEST_REACH };
}

function playerTarget(ctx: BehaviourContext): TargetInfo {
  return { position: ctx.player, kind: 'player', reach: PLAYER_REACH };
}

/** Walk across the ground toward the target with a little side-to-side weave. */
function groundMove(self: EnemyState, target: TargetInfo, ctx: BehaviourContext, weave: number): void {
  const dx = target.position.x - self.position.x;
  const dz = target.position.z - self.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist > target.reach * 0.9) {
    const wobble = Math.sin(ctx.elapsed * 3 + self.phase) * weave * Math.min(1, dist / 12);
    const heading = Math.atan2(dx, dz) + wobble;
    const step = self.def.speed * ctx.dt;
    self.position.x += Math.sin(heading) * step;
    self.position.z += Math.cos(heading) * step;
    self.heading = heading;
  } else {
    self.heading = Math.atan2(dx, dz);
  }
  self.position.y = ctx.heightAt(self.position.x, self.position.z);
}

/** Possums and rats: beeline for the eggs. */
export const nestRaider: Behaviour = {
  chooseTarget: (_self, ctx) => nestTarget(ctx),
  move: (self, target, ctx) => groundMove(self, target, ctx, 0.35),
};

/** Stoats: go for the eggs, but switch to the ranger if they wander close. */
export const opportunist: Behaviour = {
  chooseTarget(self, ctx) {
    const d = Math.hypot(ctx.player.x - self.position.x, ctx.player.z - self.position.z);
    return d < 14 ? playerTarget(ctx) : nestTarget(ctx);
  },
  move: (self, target, ctx) => groundMove(self, target, ctx, 0.6),
};

/** Wasps: fly at the player in a bobbing, circling approach. */
export const swarmFlyer: Behaviour = {
  chooseTarget: (_self, ctx) => playerTarget(ctx),
  move(self, target, ctx) {
    const dx = target.position.x - self.position.x;
    const dz = target.position.z - self.position.z;
    const dist = Math.hypot(dx, dz);
    const orbit = dist < 6 ? 1.3 : 0.4;
    const heading = Math.atan2(dx, dz) + Math.sin(ctx.elapsed * 2 + self.phase) * orbit;
    const step = self.def.speed * ctx.dt;
    if (dist > 1) {
      self.position.x += Math.sin(heading) * step;
      self.position.z += Math.cos(heading) * step;
    }
    self.heading = heading;
    const ground = ctx.heightAt(self.position.x, self.position.z);
    const cruise = dist < 6 ? 0.6 : 2.5;
    const desiredY = ground + cruise + Math.sin(ctx.elapsed * 5 + self.phase) * 0.4;
    self.position.y += (desiredY - self.position.y) * Math.min(1, ctx.dt * 3);
  },
};
