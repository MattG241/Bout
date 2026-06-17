// Scheduled function: generate, VALIDATE, and publish the global daily puzzle.
// Publishes today + a buffer of upcoming days. The mandatory pre-publish validator
// (assertPublishable) runs on every puzzle — a broken/ambiguous puzzle is never written.
// deno-lint-ignore-file no-explicit-any
import { generateDailyPuzzle, assertPublishable, toClientPayload } from '../_shared/core.mjs';
import { serviceClient, json, errorResponse, utcToday } from '../_shared/util.ts';

const BUFFER_DAYS = 3; // keep a few days pre-generated so the morning drop never misses

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const db = serviceClient();
    const start = utcToday();
    const results: Array<{ date: string; type: string; status: string }> = [];

    for (let i = 0; i <= BUFFER_DAYS; i++) {
      const date = addDays(start, i);

      const { data: existing } = await db.from('puzzles').select('id, published').eq('play_date', date).maybeSingle();
      if (existing?.published) {
        results.push({ date, type: '-', status: 'already-published' });
        continue;
      }

      // Generate deterministically and gate on the validator. Throws if not provably valid.
      const puzzle = generateDailyPuzzle(date);
      assertPublishable(puzzle);
      const client = toClientPayload(puzzle);

      const { data: up, error: upErr } = await db
        .from('puzzles')
        .upsert(
          {
            play_date: date,
            type: puzzle.type,
            difficulty: puzzle.difficulty,
            payload: client.payload,
            speed_window: puzzle.speedWindow ?? null,
            // Only publish today and past; future days stay unpublished until their day.
            published: date <= start,
          },
          { onConflict: 'play_date' },
        )
        .select('id')
        .single();
      if (upErr) throw upErr;

      await db.from('puzzle_solutions').upsert({ puzzle_id: up.id, solution: puzzle.solution });
      results.push({ date, type: puzzle.type, status: date <= start ? 'published' : 'staged' });
    }

    return json({ ok: true, results });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
