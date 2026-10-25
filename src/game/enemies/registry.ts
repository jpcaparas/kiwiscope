import { Registry } from '../core/Registry';
import type { EnemyDef } from './types';
import { nestRaider, opportunist, swarmFlyer } from './behaviours';
import { possumModel, ratModel, stoatModel, waspModel } from './models';

/**
 * The introduced pests of Aotearoa. Possums, stoats and rats are the main
 * targets of Predator Free 2050; German wasps are a notorious bush pest.
 */
export const enemies = new Registry<EnemyDef>('enemy')
  .register('possum', {
    name: 'Possum',
    health: 70,
    speed: 3.2,
    radius: 0.75,
    centerHeight: 0.65,
    bite: 6,
    biteInterval: 1.0,
    score: 100,
    dropChance: 0.22,
    furColor: '#5d5550',
    behaviour: nestRaider,
    build: () => possumModel(),
  })
  .register('stoat', {
    name: 'Stoat',
    health: 40,
    speed: 6.2,
    radius: 0.55,
    centerHeight: 0.4,
    bite: 8,
    biteInterval: 0.8,
    score: 150,
    dropChance: 0.18,
    furColor: '#8a5a32',
    behaviour: opportunist,
    build: stoatModel,
  })
  .register('rat', {
    name: 'Rat',
    health: 18,
    speed: 4.8,
    radius: 0.45,
    centerHeight: 0.3,
    bite: 3,
    biteInterval: 0.7,
    score: 50,
    dropChance: 0.08,
    furColor: '#3e3a36',
    behaviour: nestRaider,
    build: ratModel,
  })
  .register('wasp', {
    name: 'German Wasp',
    health: 12,
    speed: 7.5,
    radius: 0.5,
    centerHeight: 0,
    bite: 5,
    biteInterval: 1.1,
    score: 120,
    dropChance: 0.1,
    furColor: '#f2c014',
    radar: { color: '#f2c014', size: 2 },
    behaviour: swarmFlyer,
    build: waspModel,
    animate: (model, t, phase) => {
      for (const c of model.children) if (c.name === 'wing') c.rotation.x = Math.sin(t * 60 + phase) * 0.6;
    },
  })
  .register('megaPossum', {
    name: 'Mega Possum',
    health: 900,
    speed: 2.4,
    radius: 2.1,
    centerHeight: 1.8,
    bite: 18,
    biteInterval: 1.2,
    score: 2000,
    dropChance: 1,
    furColor: '#5d5550',
    radar: { color: '#ff3b3b', size: 5 },
    boss: true,
    behaviour: nestRaider,
    build: () => possumModel(2.9),
  });
