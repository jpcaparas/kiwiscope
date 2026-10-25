// Renders build/icon.svg to the 1024px PNG electron-builder derives icns/ico from.
// Requires `rsvg-convert` (librsvg). The generated PNG is committed, so this only
// needs re-running when the SVG changes.
import { execFileSync } from 'node:child_process';

execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', 'build/icon.svg', '-o', 'build/icon.png'], {
  stdio: 'inherit',
});
console.log('wrote build/icon.png');
