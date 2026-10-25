// Records a scripted playthrough of KiwiScope to docs/kiwiscope-playthrough.mp4.
//
//   npm run build && node scripts/record-demo.mjs
//
// Launches Electron with remote debugging, injects an autopilot that aims,
// shoots, strafes and switches weapons, captures frames with the Chrome
// DevTools screencast, then muxes the radio voice lines back in at the moments
// they played. Requires ffmpeg on PATH. Nothing here ships in the game bundle.
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'node:os';

const PORT = 9333;
const OUT = resolve('docs/kiwiscope-playthrough.mp4');
const POSTER = resolve('docs/kiwiscope-poster.jpg');
const WORK = join(tmpdir(), `kiwiscope-demo-${Date.now()}`);
const MAX_SECONDS = 120;

// ---------------------------------------------------------------- CDP client
async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return openSocket(page.webSocketDebuggerUrl);
    } catch {
      /* Electron still starting */
    }
    await sleep(250);
  }
  throw new Error('Could not reach Electron DevTools endpoint');
}

async function openSocket(url) {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method && handlers.has(msg.method)) {
      handlers.get(msg.method)(msg.params);
    }
  });
  const send = (method, params = {}) =>
    new Promise((res) => {
      pending.set(++id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  return { send, evaluate, on: (m, fn) => handlers.set(m, fn), close: () => ws.close() };
}

// ---------------------------------------------------------------- autopilot (runs in the page)
const AUTOPILOT = `(() => {
  const g = window.__kiwiscope;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  const demo = (window.__demo = { voice: [], done: false, stage: 'intro' });

  // Log radio lines so the recorder can mix the audio back in.
  const say = g.radio.say.bind(g.radio);
  g.radio.say = (ids, priority, cooldown) => {
    const ok = say(ids, priority, cooldown);
    if (ok && g.radio.current) demo.voice.push({ t: now(), file: g.radio.current.src.split('/').pop() });
    return ok;
  };

  // Scripted demo: keep the ranger and nest standing so the reel isn't cut short.
  const keepAlive = () => {
    if (g.player.health < 45) g.player.heal(40);
    if (g.nestHealth < 50) g.nestHealth = 50;
  };

  let chosenSlot = 0, choiceTime = 0, strafeKey = 'KeyD', strafeTime = 0, lastPressed = false;
  const input = g.input;
  const hold = (code, on) => (on ? input.down.add(code) : input.down.delete(code));

  const pickSlot = (target, dist) => {
    const boss = g.enemies.active.find((e) => e.def.boss);
    if (boss && dist < 60 && target === boss) return 3;          // Jandal Launcher on the boss
    if (dist < 13) return 1;                                     // No. 8 Wire up close
    if (g.enemies.count >= 6) return 2;                          // Feijoa Flinger into crowds
    return 0;                                                    // Pāua Pistol otherwise
  };

  const pickTarget = () => {
    let best = null, bestScore = Infinity;
    for (const e of g.enemies.active) {
      const toNest = Math.hypot(e.position.x, e.position.z);
      const toMe = e.position.distanceTo(g.player.position);
      const score = toNest * 0.6 + toMe * 0.4 - (e.def.boss ? 25 : 0);
      if (score < bestScore) { best = e; bestScore = score; }
    }
    return best;
  };

  const turnToward = (yaw, pitch, dt, rate) => {
    let dy = yaw - g.player.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.player.yaw += dy * Math.min(1, dt * rate);
    g.player.pitch += (pitch - g.player.pitch) * Math.min(1, dt * rate);
    return Math.abs(dy) + Math.abs(pitch - g.player.pitch);
  };

  g.handleWeaponInput = function () {
    const dt = 1 / 60;
    keepAlive();
    const t = now();
    const target = pickTarget();
    if (!target) {
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) hold(k, false);
      turnToward(g.player.yaw + 0.35, -0.08, dt, 1.5); // slow look around the bush
      return;
    }
    const eye = g.camera.position;
    const c = g.enemies.hitCenter(target);
    const dx = c.x - eye.x, dy = c.y - eye.y, dz = c.z - eye.z;
    const dist = Math.hypot(dx, dz);
    const err = turnToward(Math.atan2(-dx, -dz), Math.atan2(dy, dist), dt, 7);

    const slot = pickSlot(target, dist);
    if (slot !== chosenSlot && t - choiceTime > 2.2) {
      chosenSlot = slot; choiceTime = t;
      g.weapons.select(slot);
    }
    if (g.weapons.current.ammo === 0 && !g.weapons.current.reloading) g.weapons.reload();

    // Strafe back and forth around the burrow; walk home (relative to facing) if drifting away.
    if (t - strafeTime > 1.8) { strafeTime = t; strafeKey = strafeKey === 'KeyD' ? 'KeyA' : 'KeyD'; }
    const px = g.player.position.x, pz = g.player.position.z;
    const home = Math.hypot(px, pz);
    const far = home > 8;
    const y = g.player.yaw;
    const fwd = far ? (-px * -Math.sin(y) + -pz * -Math.cos(y)) / home : 0;
    const right = far ? (-px * Math.cos(y) + -pz * -Math.sin(y)) / home : 0;
    hold('KeyW', fwd > 0.3);
    hold('KeyS', fwd < -0.3);
    hold('KeyD', far ? right > 0.3 : strafeKey === 'KeyD');
    hold('KeyA', far ? right < -0.3 : strafeKey === 'KeyA');
    if (Math.random() < 0.004) input.pressed.add('Space');

    if (err > 0.06 || dist > 70) return;
    const pressed = !lastPressed;
    lastPressed = pressed;
    const direction = new g.camera.position.constructor();
    g.camera.getWorldDirection(direction);
    const kick = g.weapons.trigger({
      origin: g.camera.position.clone(), direction, enemies: g.enemies, projectiles: g.projectiles,
      fx: g.fx, events: g.events, heightAt: (x, z) => g.world.heightAt(x, z), muzzle: g.weapons.muzzleWorld,
    }, pressed);
    g.player.pitch += kick;
  };

  // Stage machine: intro → wave 1 → skip to the wave-5 boss → wrap up.
  g.events.on('waveCleared', ({ wave }) => {
    if (wave === 1) demo.stage = 'boss';
    else { demo.stage = 'outro'; setTimeout(() => (demo.done = true), 4500); }
  });
  // After wave 1, skip straight to the halfway boss wave (the HUD never shows the jump).
  const nextWave = g.startNextWave.bind(g);
  g.startNextWave = () => {
    if (demo.stage === 'boss' && g.wave === 1) g.wave = 4;
    nextWave();
  };
  g.start();
  return 'autopilot engaged';
})()`;

// ---------------------------------------------------------------- recording
async function record(cdp) {
  await mkdir(join(WORK, 'frames'), { recursive: true });
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(WORK, 'frames', `${String(frames.length).padStart(6, '0')}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId });
    await writeFile(file, Buffer.from(data, 'base64'));
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
  console.log(await cdp.evaluate(AUTOPILOT));

  const started = Date.now();
  while ((Date.now() - started) / 1000 < MAX_SECONDS) {
    await sleep(1000);
    const state = await cdp.evaluate('({ done: window.__demo.done, stage: window.__demo.stage, wave: window.__kiwiscope.wave, pests: window.__kiwiscope.enemies.count })');
    process.stdout.write(`\r${Math.round((Date.now() - started) / 1000)}s stage=${state.stage} wave=${state.wave} pests=${state.pests}   `);
    if (state.done) break;
  }
  await cdp.send('Page.stopScreencast');
  const voice = await cdp.evaluate('window.__demo.voice');
  await sleep(500);
  console.log(`\ncaptured ${frames.length} frames, ${voice.length} voice lines`);
  return { frames, voice };
}

// ---------------------------------------------------------------- encoding
function ffmpeg(args) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));
  });
}

async function encode({ frames, voice }) {
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1]?.t ?? f.t + 1 / 30;
      return `file '${f.file}'\nduration ${(next - f.t).toFixed(4)}`;
    })
    .join('\n');
  await writeFile(join(WORK, 'frames.txt'), `${list}\nfile '${frames.at(-1).file}'\n`);
  const silent = join(WORK, 'video.mp4');
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', join(WORK, 'frames.txt'), '-vf', 'fps=30,scale=1280:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', silent]);

  // Voice times are relative to autopilot start, which is within a frame of the first captured frame.
  const clips = voice.map((v) => ({ path: resolve('src/assets/voice', `${v.file.split('-')[0]}.mp3`), ms: Math.max(0, Math.round(v.t * 1000)) }))
    .filter((c) => existsSync(c.path));
  if (clips.length === 0) {
    await ffmpeg(['-i', silent, '-c', 'copy', '-movflags', '+faststart', OUT]);
  } else {
    const inputs = clips.flatMap((c) => ['-i', c.path]);
    const total = (frames.at(-1).t - frames[0].t).toFixed(2);
    const delays = clips.map((c, i) => `[${i + 2}:a]adelay=${c.ms}|${c.ms}[a${i}]`).join(';');
    // apad + duration=first keeps the audio as long as the video instead of the shortest clip.
    const mix = `[1:a]${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length + 1}:duration=first:normalize=0,volume=1.6[aout]`;
    await ffmpeg(['-i', silent, '-f', 'lavfi', '-t', total, '-i', 'anullsrc=r=44100:cl=stereo', ...inputs, '-filter_complex', `${delays};${mix}`, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', OUT]);
  }
  await ffmpeg(['-ss', '00:00:20', '-i', OUT, '-frames:v', '1', '-q:v', '3', POSTER]);
}

// ---------------------------------------------------------------- main
await mkdir('docs', { recursive: true });
const electronBin = resolve('node_modules/.bin/electron');
const app = spawn(
  electronBin,
  ['.', `--remote-debugging-port=${PORT}`, '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
  { stdio: 'ignore', env: { ...process.env, KIWISCOPE_RECORDING: '1' } },
);
try {
  const cdp = await connect();
  await sleep(2500); // let the world build and the title screen settle
  const result = await record(cdp);
  cdp.close();
  await encode(result);
  console.log(`wrote ${OUT}\nwrote ${POSTER}`);
  console.log((await readdir(join(WORK, 'frames'))).length, 'frames encoded');
} finally {
  app.kill();
  await rm(WORK, { recursive: true, force: true });
}
