#!/usr/bin/env node
/**
 * Bout puzzle tool — generate an unlimited stream of UNIQUE puzzles (no two ever the same).
 *
 * Uses the same shared, server-authoritative core the app and Edge Functions use, so every
 * puzzle is validated (exactly one solution) and fingerprint-deduplicated.
 *
 * Usage:
 *   node scripts/gen-puzzles.mjs [--type word|logic|number|visual|memory|trivia|weekend]
 *                                [--count N] [--difficulty easy|medium|hard]
 *                                [--salt S] [--out file.jsonl] [--with-solutions] [--stats]
 *
 * Examples:
 *   node scripts/gen-puzzles.mjs --count 20
 *   node scripts/gen-puzzles.mjs --type weekend --count 1000 --out weekend.jsonl --stats
 */
import { writeFileSync } from 'node:fs';
import { createUniqueStream, fingerprint, validateSubmission, toClientPayload } from '../supabase/functions/_shared/core.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const type = arg('type', undefined);
const difficulty = arg('difficulty', undefined);
const count = Number(arg('count', 10));
const salt = arg('salt', `cli-${Date.now()}`);
const out = arg('out', undefined);
const withSolutions = arg('with-solutions', false) === true;
const stats = arg('stats', false) === true;

const stream = createUniqueStream({ type, difficulty, salt });
const fps = new Set();
const lines = [];
const byType = {};
let duplicates = 0;

const t0 = Date.now();
for (let i = 0; i < count; i++) {
  const p = stream.next();
  const fp = fingerprint(p);
  if (fps.has(fp)) duplicates++;
  fps.add(fp);
  byType[p.type] = (byType[p.type] ?? 0) + 1;

  const record = withSolutions ? { ...p, fingerprint: fp } : { ...toClientPayload(p), fingerprint: fp };
  lines.push(JSON.stringify(record));
}
const ms = Date.now() - t0;

if (out) {
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(`Wrote ${count} unique puzzles → ${out}`);
} else {
  // Pretty-print the first few so it's readable on the terminal.
  for (const line of lines.slice(0, 5)) console.log(line);
  if (lines.length > 5) console.log(`… and ${lines.length - 5} more`);
}

if (stats || !out) {
  console.error('---');
  console.error(`generated   : ${count}`);
  console.error(`unique fps  : ${fps.size}`);
  console.error(`duplicates  : ${duplicates}`);
  console.error(`by type     : ${JSON.stringify(byType)}`);
  console.error(`time        : ${ms}ms  (${(count / (ms / 1000)).toFixed(0)}/s)`);
  // Sanity: an empty submission must never score a perfect on the first puzzle.
  const sample = stream.next();
  console.error(`sanity      : empty-submission accuracy = ${validateSubmission(sample, {}).accuracy} (expected < 1)`);
}

if (duplicates > 0) {
  console.error('ERROR: duplicates detected — uniqueness guarantee violated');
  process.exit(1);
}
