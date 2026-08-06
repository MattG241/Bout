// Onboard a solo user into a house league of similar-skill strangers (cold-start soft
// landing). Uses the shared matching logic; creates a fresh house league + season if none
// has room. Idempotent: a user already in a league is returned as-is.
// deno-lint-ignore-file no-explicit-any
import { matchHouseLeague, buildSeasonWindow, SEED_WEIGHT_CLASS } from '../_shared/core.mjs';
import { serviceClient, requireUser, json, errorResponse, utcToday } from '../_shared/util.ts';

const HOUSE_CAPACITY = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const { userId } = await requireUser(req);
    const db = serviceClient();

    // Candidate house leagues with current member counts.
    const { data: houses } = await db.from('leagues').select('id, capacity').eq('type', 'house');
    const candidates: any[] = [];
    for (const h of houses ?? []) {
      const { count } = await db.from('memberships').select('*', { count: 'exact', head: true }).eq('league_id', h.id);
      candidates.push({ leagueId: h.id, weightClass: SEED_WEIGHT_CLASS, memberCount: count ?? 0, capacity: h.capacity });
    }

    let leagueId = matchHouseLeague(candidates, SEED_WEIGHT_CLASS);

    // None with room → create a new house league + active season.
    if (!leagueId) {
      const { data: league } = await db
        .from('leagues')
        .insert({ type: 'house', name: `House League ${(houses?.length ?? 0) + 1}`, capacity: HOUSE_CAPACITY })
        .select('id')
        .single();
      leagueId = league!.id;
      const w = buildSeasonWindow(utcToday());
      await db.from('seasons').insert({
        league_id: leagueId,
        name: 'Season 1',
        starts_on: w.startsOn,
        finals_starts_on: w.finalsStartsOn,
        ends_on: w.endsOn,
        status: 'active',
      });
    }

    // Join (idempotent) + seed standing in the active season.
    await db.from('memberships').upsert(
      { user_id: userId, league_id: leagueId, weight_class: SEED_WEIGHT_CLASS },
      { onConflict: 'user_id,league_id' },
    );
    const { data: season } = await db
      .from('seasons')
      .select('id')
      .eq('league_id', leagueId)
      .in('status', ['active', 'finals'])
      .order('starts_on', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (season) {
      await db.from('standings').upsert(
        { season_id: season.id, league_id: leagueId, user_id: userId, weight_class: SEED_WEIGHT_CLASS },
        { onConflict: 'season_id,user_id' },
      );
    }

    return json({ ok: true, leagueId });
  } catch (e) {
    const msg = (e as Error).message;
    return errorResponse(msg, msg === 'unauthorized' ? 401 : 500);
  }
});
