import { Registry } from '../core/Registry';

/** Phrase banks for HUD toasts. Register a new bank to add a new kind of message. */
export const slang = new Registry<readonly string[]>('slang')
  .register('kill', ['Chur!', 'Sweet as!', 'Choice!', 'Mean as!', 'Tu meke!', 'Hard out!', 'Good as gold!', 'Too easy!'])
  .register('multiKill', ['Double whammy, bro!', 'Absolute scenes!', 'Chur chur!', 'Get in!'])
  .register('bossKill', ['Mega Possum: munted.', 'That possum is history.', 'Legend!']);

export function phrase(bank: string): string {
  const options = slang.get(bank);
  return options[Math.floor(Math.random() * options.length)];
}
