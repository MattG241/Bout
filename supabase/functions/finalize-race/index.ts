// Live race (optional, synchronous): finalize a head-to-head once everyone finishes.
// Ranks participants by accuracy then time, assigns places, marks the race finished.
// The race is a side experience — it never affects the season ladder.
// deno-lint-ignore-file no-explicit-any
import { serviceClient, requireUser, json, errorResponse } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    await requireUser(req);
    const { raceId } = await req.json();
    if (!raceId) return errorResponse('raceId required');
    const db = serviceClient();

    const { data: parts, error } = await db
      .from('live_race_participants')
      .select('user_id, accuracy, time_ms, finished_at')
      .eq('race_id', raceId);
    if (error) throw error;

    const finished = (parts ?? []).filter((p: any) => p.finished_at);
    // Rank: higher accuracy wins; ties broken by faster time.
    finished.sort((a: any, b: any) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || (a.time_ms ?? 1e9) - (b.time_ms ?? 1e9));

    for (let i = 0; i < finished.length; i++) {
      await db
        .from('live_race_participants')
        .update({ place: i + 1 })
        .eq('race_id', raceId)
        .eq('user_id', finished[i].user_id);
    }
    await db.from('live_races').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', raceId);

    return json({ ok: true, places: finished.map((p: any, i: number) => ({ userId: p.user_id, place: i + 1 })) });
  } catch (e) {
    const msg = (e as Error).message;
    return errorResponse(msg, msg === 'unauthorized' ? 401 : 500);
  }
});
