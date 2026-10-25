import { Registry } from '../core/Registry';
import type { Weapon } from './Weapon';
import { FeijoaFlinger, JandalLauncher, Number8Scattergun, PauaPistol } from './kiwiana';

/**
 * Weapon factories in slot order (keys 1..n). To add a weapon, subclass
 * Weapon, implement onFire + buildViewModel, and register it here.
 */
export const weaponFactories = new Registry<() => Weapon>('weapon')
  .register('paua', () => new PauaPistol())
  .register('number8', () => new Number8Scattergun())
  .register('feijoa', () => new FeijoaFlinger())
  .register('jandal', () => new JandalLauncher());
