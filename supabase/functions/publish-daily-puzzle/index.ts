// Scheduled function: generate, VALIDATE, and publish the global daily puzzle.
// Publishes today + a buffer of upcoming days. The mandatory pre-publish validator
// (assertPublishable) runs on every puzzle — a broken/ambiguous puzzle is never written.
// deno-lint-ignore-file no-explicit-any
import { generateUniqueDaily, assertPublishable, toClientPayload } from '../_shared/core.mjs';
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

    // Load every fingerprint ever shipped so we can guarantee the new puzzle is unlimited-unique
    // (no two daily puzzles, across all of history, are ever exactly the same).
    const { data: priorRows } = await db.from('puzzles').select('fingerprint').not('fingerprint', 'is', null);
    const seen = new Set<string>((priorRows ?? []).map((r: any) => r.fingerprint));

    for (let i = 0; i <= BUFFER_DAYS; i++) {
      const date = addDays(start, i);

      const { data: existing } = await db.from('puzzles').select('id, published').eq('play_date', date).maybeSingle();
      if (existing?.published) {
        results.push({ date, type: '-', status: 'already-published' });
        continue;
      }

      // Generate a unique, validated puzzle for the day: keeps the scheduled type/difficulty but
      // bumps the salt until the fingerprint has never been shipped before. Throws if invalid.
      const { puzzle, fingerprint } = generateUniqueDaily(date, seen);
      assertPublishable(puzzle);
      seen.add(fingerprint); // reserve it for the rest of this run too
      const client = toClientPayload(puzzle);

      // Memory is the one type whose challenge REQUIRES briefly showing the target so the
      // player can memorise it. We attach the sequence as a display-only `flash` field on the
      // client payload (a documented, isolated exception to the no-leak rule). Every other
      // type's solution stays exclusively in puzzle_solutions.
      const payload: any = client.payload;
      if (puzzle.type === 'memory') {
        payload.flash = (puzzle.solution as any).sequence;
      }

      const { data: up, error: upErr } = await db
        .from('puzzles')
        .upsert(
          {
            play_date: date,
            type: puzzle.type,
            difficulty: puzzle.difficulty,
            payload,
            speed_window: puzzle.speedWindow ?? null,
            fingerprint,
            // Publish today and tomorrow (so timezones ahead of UTC can fetch their local
            // "today"); later buffer days stay staged/unpublished until their turn.
            published: date <= addDays(start, 1),
          },
          { onConflict: 'play_date' },
        )
        .select('id')
        .single();
      if (upErr) throw upErr;

      await db.from('puzzle_solutions').upsert({ puzzle_id: up.id, solution: puzzle.solution });
      results.push({ date, type: puzzle.type, status: date <= addDays(start, 1) ? 'published' : 'staged' });
    }

    return json({ ok: true, results });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
