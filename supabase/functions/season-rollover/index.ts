// Scheduled (daily): advance season lifecycle for every league.
//  - active → finals when the finals window opens
//  - finals → complete when it ends, then compute promotion/relegation, reset points
//    (streaks carry), and open the next season.
// deno-lint-ignore-file no-explicit-any
import {
  rankStandings,
  computeDivisionChanges,
  resetForNewSeason,
  buildSeasonWindow,
  nextSeasonStart,
} from '../_shared/core.mjs';
import { serviceClient, json, errorResponse, utcToday } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const db = serviceClient();
    const today = utcToday();
    const events: any[] = [];

    const { data: seasons, error } = await db
      .from('seasons')
      .select('*')
      .in('status', ['active', 'finals']);
    if (error) throw error;

    for (const s of seasons ?? []) {
      // active → finals
      if (s.status === 'active' && today >= s.finals_starts_on && today <= s.ends_on) {
        await db.from('seasons').update({ status: 'finals' }).eq('id', s.id);
        events.push({ season: s.id, to: 'finals' });
        continue;
      }
      // (finals or active) → complete
      if (today > s.ends_on) {
        const { data: rows } = await db
          .from('standings')
          .select('user_id, weight_class, total_points, played_count, current_streak, best_streak')
          .eq('season_id', s.id);

        const ranked = rankStandings(
          (rows ?? []).map((r: any) => ({
            userId: r.user_id,
            weightClass: r.weight_class,
            totalPoints: r.total_points,
            playedCount: r.played_count,
            currentStreak: r.current_streak,
            bestStreak: r.best_streak,
          })),
        );
        const changes = computeDivisionChanges(ranked);
        const seed = resetForNewSeason(ranked, changes);

        await db.from('seasons').update({ status: 'complete' }).eq('id', s.id);

        // Open the next season for this league.
        const prevWindow = buildSeasonWindow(s.starts_on);
        const newStart = nextSeasonStart(prevWindow);
        const newWindow = buildSeasonWindow(newStart);
        const seasonName = `Season ${(parseInt(String(s.name).replace(/\D/g, '')) || 1) + 1}`;
        const { data: newSeason } = await db
          .from('seasons')
          .insert({
            league_id: s.league_id,
            name: seasonName,
            starts_on: newWindow.startsOn,
            finals_starts_on: newWindow.finalsStartsOn,
            ends_on: newWindow.endsOn,
            status: 'active',
          })
          .select('id')
          .single();

        if (newSeason) {
          // Seed the new season's standings at the (possibly changed) weight classes.
          const seedRows = seed.map((r) => ({
            season_id: newSeason.id,
            league_id: s.league_id,
            user_id: r.userId,
            weight_class: r.weightClass,
            total_points: 0,
            played_count: 0,
            current_streak: r.currentStreak,
            best_streak: r.bestStreak,
          }));
          if (seedRows.length) await db.from('standings').insert(seedRows);
          // Reflect new weight classes on memberships.
          for (const c of changes) {
            if (c.direction !== 'stay') {
              await db.from('memberships').update({ weight_class: c.to }).eq('user_id', c.userId).eq('league_id', s.league_id);
            }
          }
        }
        events.push({ season: s.id, to: 'complete', nextSeason: newSeason?.id, promotions: changes.filter((c) => c.direction !== 'stay').length });
      }
    }

    return json({ ok: true, events });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
