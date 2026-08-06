/**
 * Generate Bout's sound cues as 16-bit PCM WAVs — no external assets, no deps. Deliberately
 * subtle and modern (not arcade-y), in keeping with the stripped-back design. Swap these for
 * professionally-produced audio anytime; the filenames are the contract (see src/lib/sound.ts).
 *
 *   tap    — a soft tick for selections / keypad (very quiet, ~40ms)
 *   submit — a low, short confirm thud when you commit an answer
 *   bell   — the iconic boxing bell, softened, for the result reveal / personal best
 *   streak — a short ascending two-note when your streak ticks up
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 44100;
mkdirSync('assets/sounds', { recursive: true });

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Build `ms` of audio from a list of partials, each {freq, gain}, with an exp-decay envelope.
function tone(ms, partials, { attack = 0.004, decay = 6, gain = 0.25 } = {}) {
  const n = Math.floor((ms / 1000) * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t);
    let s = 0;
    for (const p of partials) s += (p.gain ?? 1) * Math.sin(2 * Math.PI * p.freq * t);
    out[i] = (s / partials.length) * env * gain;
  }
  return out;
}

function concat(...parts) {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// tap — quiet, crisp click.
writeFileSync('assets/sounds/tap.wav', wav(tone(45, [{ freq: 1500 }], { decay: 40, gain: 0.12 })));

// submit — low, soft confirm.
writeFileSync('assets/sounds/submit.wav', wav(tone(140, [{ freq: 220 }, { freq: 330, gain: 0.5 }], { decay: 14, gain: 0.22 })));

// bell — softened boxing bell: detuned partials, longer ring.
writeFileSync(
  'assets/sounds/bell.wav',
  wav(tone(700, [{ freq: 660 }, { freq: 990, gain: 0.6 }, { freq: 1320, gain: 0.3 }], { decay: 5, gain: 0.26 })),
);

// streak — ascending two-note.
writeFileSync(
  'assets/sounds/streak.wav',
  wav(concat(
    tone(130, [{ freq: 660 }], { decay: 9, gain: 0.2 }),
    tone(200, [{ freq: 880 }, { freq: 1320, gain: 0.4 }], { decay: 7, gain: 0.22 }),
  )),
);

console.log('Generated cues → assets/sounds/{tap,submit,bell,streak}.wav');
