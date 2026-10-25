// Generates the radio voice lines in src/assets/voice/ with ElevenLabs TTS.
//
//   ELEVENLABS_API_KEY=... node scripts/generate-voices.mjs [lineId ...]
//
// The key is read from the environment only and is never written anywhere.
// Generated clips are committed, so players and contributors never need a key.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const OUT_DIR = 'src/assets/voice';
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Set ELEVENLABS_API_KEY to regenerate voice lines.');
  process.exit(1);
}

const manifest = JSON.parse(await readFile('scripts/voice-lines.json', 'utf8'));
const only = new Set(process.argv.slice(2));
await mkdir(OUT_DIR, { recursive: true });

for (const [id, text] of Object.entries(manifest.lines)) {
  if (only.size && !only.has(id)) continue;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${manifest.voiceId}?output_format=mp3_44100_64`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: manifest.modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 },
    }),
  });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${await res.text()}`);
  await writeFile(`${OUT_DIR}/${id}.mp3`, Buffer.from(await res.arrayBuffer()));
  console.log(`wrote ${OUT_DIR}/${id}.mp3`);
}
