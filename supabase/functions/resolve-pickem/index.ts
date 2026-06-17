// Scheduled (after a play day closes): resolve every league's pick'em predictions.
// Determines the day's crew winner from attempts, awards points for correct picks, and
// folds those points into the season standings.
// deno-lint-ignore-file no-explicit-any
import { resolvePredictions } from '../_shared/core.mjs';
import { serviceClient, json, errorResponse } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const db = serviceClient();
    const body = await req.json().catch(() => ({}));
    const playDate: string = body.playDate ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    // Unresolved predictions for the day, grouped by league.
    const { data: preds, error } = await db
      .from('predictions')
      .select('id, user_id, league_id, season_id, predicted_top_user_id')
      .eq('play_date', playDate)
      .eq('resolved', false);
    if (error) throw error;
    if (!preds?.length) return json({ ok: true, resolved: 0 });

    const byLeague = new Map<string, any[]>();
    for (const p of preds) {
      const list = byLeague.get(p.league_id) ?? [];
      list.push(p);
      byLeague.set(p.league_id, list);
    }

    let resolved = 0;
    for (const [leagueId, list] of byLeague) {
      // Day scores for this league's members on this day's puzzle.
      const { data: puzzle } = await db.from('puzzles').select('id').eq('play_date', playDate).maybeSingle();
      if (!puzzle) continue;
      const { data: attempts } = await db
        .from('attempts')
        .select('user_id, final_score')
        .eq('puzzle_id', puzzle.id)
        .eq('league_id', leagueId);

      const results = (attempts ?? []).map((a: any) => ({ userId: a.user_id, dayScore: a.final_score }));
      const resolvedRows = resolvePredictions(
        list.map((p) => ({ userId: p.user_id, predictedTopUserId: p.predicted_top_user_id })),
        results,
      );

      for (let i = 0; i < list.length; i++) {
        const pred = list[i];
        const r = resolvedRows[i];
        await db
          .from('predictions')
          .update({ resolved: true, correct: r.correct, points_awarded: r.pointsAwarded })
          .eq('id', pred.id);

        if (r.pointsAwarded > 0 && pred.season_id) {
          // Add the side-bet points to the standing.
          const { data: standing } = await db
            .from('standings')
            .select('id, total_points')
            .eq('season_id', pred.season_id)
            .eq('user_id', pred.user_id)
            .maybeSingle();
          if (standing) {
            await db
              .from('standings')
              .update({ total_points: standing.total_points + r.pointsAwarded, updated_at: new Date().toISOString() })
              .eq('id', standing.id);
          }
        }
        resolved++;
      }
      await db.rpc('recompute_ranks', { p_season: list[0].season_id });
    }

    return json({ ok: true, resolved, playDate });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
