import type { Game } from './Game';
import { CONFIG } from './config';
import { phrase } from './ui/slang';
import { rollPickup } from './pickups/registry';
import type { SoundName } from './audio/Sfx';

/**
 * Subscribes HUD, audio, scoring and drops to gameplay events. Keeps the
 * reactions in one place so gameplay systems stay ignorant of presentation.
 */
export function wireFeedback(game: Game): void {
  const { events, hud, sfx, radio } = game;
  let killStreak = 0;
  let streakTimer = 0;

  events.on('weaponFired', ({ weaponId }) => sfx.play(weaponId as SoundName, 0.95 + Math.random() * 0.1));
  events.on('reloadStarted', () => sfx.play('reload'));
  events.on('dryFire', () => sfx.play('dry'));
  events.on('weaponSwitched', ({ name }) => {
    sfx.play('switch');
    hud.toast(name, 'weapon');
  });
  events.on('explosion', () => sfx.play('explosion'));

  events.on('enemyHit', () => {
    hud.hitMarker();
    sfx.play('hit');
  });

  events.on('enemyKilled', ({ def, position }) => {
    game.addScore(def.score);
    game.fx.puff(position, def.furColor, def.boss ? 60 : 14, def.boss ? 10 : 5);
    sfx.play(def.boss ? 'bossDie' : 'squeak', 0.8 + Math.random() * 0.4);

    const now = performance.now() / 1000;
    killStreak = now - streakTimer < 1.2 ? killStreak + 1 : 1;
    streakTimer = now;
    if (def.boss) hud.toast(phrase('bossKill'), 'big');
    else if (killStreak >= 2) hud.toast(`${phrase('multiKill')} x${killStreak}`, 'big');
    else if (Math.random() < 0.35) hud.toast(`${phrase('kill')} ${def.name} +${def.score}`);

    if (Math.random() < def.dropChance) {
      game.pickups.spawn(rollPickup(), position.x, game.world.heightAt(position.x, position.z), position.z);
    }
  });

  events.on('nestBitten', ({ amount }) => {
    game.damageNest(amount);
    sfx.play('nestHurt');
    if (game.nestHealth / CONFIG.nest.maxHealth < 0.35) radio.say('nestDanger', 2, 15);
  });

  events.on('playerBitten', ({ amount }) => {
    game.player.damage(amount);
    sfx.play('hurt');
    if (game.player.health < 30) radio.say('lowHealth', 2, 20);
  });

  events.on('pickupCollected', ({ label }) => {
    sfx.play('pickup');
    hud.toast(label, 'pickup');
  });

  events.on('waveStarted', ({ wave, total, boss }) => {
    hud.showBanner(`Wave ${wave} of ${total}`, boss ? 'A Mega Possum approaches!' : 'Pests inbound. Protect the burrow!');
    if (boss) radio.say('boss', 3);
    else if (wave > 1) radio.say(['wave1', 'wave2', 'wave3'], 1);
  });

  events.on('waveCleared', ({ wave }) => {
    const bonus = Math.round(game.nestHealth) * 10;
    game.addScore(bonus);
    if (wave >= CONFIG.waves.total) {
      return;
    }
    hud.showBanner('Wave cleared!', `Nest bonus +${bonus}. Snacks dropped near the burrow.`);
    radio.say(['clear1', 'clear2', 'clear3'], 2);
    sfx.play('kiwiCall');
  });
}
