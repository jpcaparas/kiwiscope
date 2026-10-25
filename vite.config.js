import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  // Relative asset paths so the bundle loads over file:// inside Electron.
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome130',
    // three.js alone is ~600 kB; the game ships as one local bundle, so splitting buys nothing.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});
