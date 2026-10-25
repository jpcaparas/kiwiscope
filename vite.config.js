import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  // Relative asset paths so the bundle loads over file:// inside Electron.
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome130',
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});
