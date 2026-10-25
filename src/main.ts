import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);

// Exposed for debugging from DevTools only; never used by game code.
(window as unknown as { __kiwiscope?: Game }).__kiwiscope = game;
