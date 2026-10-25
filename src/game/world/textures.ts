import * as THREE from 'three';

/** Procedural canvas textures. Everything is generated at runtime: no binary assets. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Yellow diamond road sign: "KIWI CROSSING" with a kiwi silhouette. */
export function kiwiSignTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#111';
    ctx.fillRect(-88, -88, 176, 176);
    ctx.fillStyle = '#f7c600';
    ctx.fillRect(-80, -80, 160, 160);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(118, 138, 40, 30, 0, 0, Math.PI * 2);
    ctx.arc(152, 116, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(162, 120);
    ctx.quadraticCurveTo(185, 132, 196, 150);
    ctx.moveTo(108, 164);
    ctx.lineTo(104, 186);
    ctx.moveTo(128, 164);
    ctx.lineTo(132, 186);
    ctx.stroke();
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KIWI', 128, 92);
  });
}

/** L&P label: "World Famous in New Zealand" style band, deliberately generic. */
export function lemonLabelTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#f4d21f';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#1d4f91';
    ctx.fillRect(0, 22, 512, 84);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEMON & PAEROA', 256, 66);
  });
}

/** Corrugated iron, the default roofing material of every bach. */
export function corrugatedTexture(color: string): THREE.CanvasTexture {
  const tex = canvasTexture(128, 128, (ctx) => {
    for (let x = 0; x < 128; x++) {
      const shade = 0.75 + 0.25 * Math.sin((x / 128) * Math.PI * 16);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.fillRect(x, 0, 1, 128);
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade).toFixed(3)})`;
      ctx.fillRect(x, 0, 1, 128);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Speckled grass so the ground isn't a flat green slab. */
export function grassTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#4f8a3a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const g = 110 + Math.floor(Math.random() * 70);
      ctx.fillStyle = `rgba(${40 + Math.floor(Math.random() * 40)},${g},${30 + Math.floor(Math.random() * 30)},0.55)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 3 + Math.random() * 3);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  return tex;
}
