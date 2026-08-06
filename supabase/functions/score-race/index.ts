// Score a live-race solve server-side (the client never has the solution). Validates the
// submission with the shared core and measures elapsed from the race's shared start time,
// so the head-to-head is fair. This never touches the season ladder — race only.
// deno-lint-ignore-file no-explicit-any
import { validateSubmission } from '../_shared/core.mjs';
import { serviceClient, requireUser, json, errorResponse } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const { userId } = await requireUser(req);
    const { raceId, submission } = await req.json();
    if (!raceId) return errorResponse('raceId required');
    const db = serviceClient();

    const { data: race } = await db.from('live_races').select('id, puzzle_id, started_at, status').eq('id', raceId).single();
    if (!race) return errorResponse('unknown_race', 404);

    const { data: puzzle } = await db
      .from('puzzles')
      .select('type, difficulty, payload')
      .eq('id', race.puzzle_id)
      .single();
    const { data: sol } = await db.from('puzzle_solutions').select('solution').eq('puzzle_id', race.puzzle_id).single();
    if (!puzzle || !sol) return errorResponse('puzzle_missing', 500);

    const validation = validateSubmission(
      { type: puzzle.type, difficulty: puzzle.difficulty, payload: puzzle.payload, solution: sol.solution } as any,
      submission,
    );

    // Server-authoritative, fair timing: from the shared race start.
    const startedAt = race.started_at ? new Date(race.started_at).getTime() : Date.now();
    const timeMs = Math.max(0, Date.now() - startedAt);

    await db
      .from('live_race_participants')
      .update({ accuracy: validation.accuracy, time_ms: timeMs, finished_at: new Date().toISOString() })
      .eq('race_id', raceId)
      .eq('user_id', userId);

    return json({ ok: true, accuracy: validation.accuracy, timeMs });
  } catch (e) {
    const msg = (e as Error).message;
    return errorResponse(msg, msg === 'unauthorized' ? 401 : 500);
  }
});
