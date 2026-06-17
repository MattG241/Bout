-- Server-authoritative RPCs. Game MATH lives in the shared TypeScript core (run by the
-- Edge Functions); these functions own PERSISTENCE, atomicity, duplicate rejection,
-- timing, and standings aggregation. All are SECURITY DEFINER with a pinned search_path.

-- ---------------------------------------------------------------------------
-- start_attempt: stamp the server-side serve time exactly once (timing authority).
-- Returns the canonical started_at the client cannot forge.
-- ---------------------------------------------------------------------------
create or replace function public.start_attempt(p_puzzle uuid)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_started timestamptz;
  v_gated   boolean;
begin
  -- Date-gate: refuse to start a future/unpublished puzzle.
  select (published and play_date <= (now() at time zone 'utc')::date)
    into v_gated from public.puzzles where id = p_puzzle;
  if not coalesce(v_gated, false) then
    raise exception 'puzzle_not_available';
  end if;

  insert into public.attempt_sessions (user_id, puzzle_id)
  values (auth.uid(), p_puzzle)
  on conflict (user_id, puzzle_id) do nothing;

  select started_at into v_started
  from public.attempt_sessions
  where user_id = auth.uid() and puzzle_id = p_puzzle;

  return v_started;
end;
$$;

-- ---------------------------------------------------------------------------
-- recompute_ranks: re-rank a season's standings within each weight class.
-- Points desc, then games played desc, then current streak desc, then id (stable).
-- ---------------------------------------------------------------------------
create or replace function public.recompute_ranks(p_season uuid)
returns void
language sql security definer set search_path = public as $$
  with ranked as (
    select id,
      row_number() over (
        partition by weight_class
        order by total_points desc, played_count desc, current_streak desc, user_id
      ) as rnk
    from public.standings
    where season_id = p_season
  )
  update public.standings s
  set rank = r.rnk
  from ranked r
  where s.id = r.id;
$$;

-- ---------------------------------------------------------------------------
-- commit_attempt: persist a scored attempt atomically. Rejects duplicates and
-- updates every active-season standing the user belongs to, applying finals
-- doubling per-season. The Edge Function supplies all game math via the core.
-- ---------------------------------------------------------------------------
create or replace function public.commit_attempt(
  p_user                uuid,
  p_puzzle              uuid,
  p_completed           boolean,
  p_accuracy            numeric,
  p_time_ms             int,
  p_raw_score           int,
  p_streak_at_attempt   int,
  p_final_score         int,
  p_new_current_streak  int,
  p_new_best_streak     int
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_attempt_id uuid;
  v_play_date  date;
  m            record;
  v_season     record;
  v_points     int;
  v_seasons    uuid[] := '{}';
begin
  select play_date into v_play_date from public.puzzles where id = p_puzzle;
  if v_play_date is null then raise exception 'unknown_puzzle'; end if;

  -- Duplicate rejection: one attempt per user per puzzle, ever.
  insert into public.attempts (
    user_id, puzzle_id, completed, accuracy, time_ms, raw_score,
    streak_at_attempt, final_score
  )
  values (
    p_user, p_puzzle, p_completed, p_accuracy, p_time_ms, p_raw_score,
    p_streak_at_attempt, p_final_score
  )
  on conflict (user_id, puzzle_id) do nothing
  returning id into v_attempt_id;

  if v_attempt_id is null then
    raise exception 'already_attempted';
  end if;

  -- Fan out to every league the user is in that has a live season covering today.
  for m in
    select mem.league_id, mem.weight_class
    from public.memberships mem
    where mem.user_id = p_user
  loop
    select * into v_season
    from public.seasons
    where league_id = m.league_id
      and status in ('active','finals')
      and v_play_date between starts_on and ends_on
    order by starts_on desc
    limit 1;

    if v_season.id is null then continue; end if;

    -- Finals week doubles the contribution to THIS season's ladder.
    v_points := case when v_season.status = 'finals'
                       or v_play_date >= v_season.finals_starts_on
                     then p_final_score * 2 else p_final_score end;

    insert into public.standings (
      season_id, league_id, user_id, total_points, played_count,
      weight_class, current_streak, best_streak, updated_at
    )
    values (
      v_season.id, m.league_id, p_user, v_points, 1,
      m.weight_class, p_new_current_streak, p_new_best_streak, now()
    )
    on conflict (season_id, user_id) do update
      set total_points   = public.standings.total_points + excluded.total_points,
          played_count   = public.standings.played_count + 1,
          current_streak = excluded.current_streak,
          best_streak    = greatest(public.standings.best_streak, excluded.best_streak),
          updated_at     = now();

    -- Tag the attempt with one representative season/league (first crew, else house).
    update public.attempts
      set season_id = coalesce(season_id, v_season.id),
          league_id = coalesce(league_id, m.league_id)
      where id = v_attempt_id;

    v_seasons := array_append(v_seasons, v_season.id);
  end loop;

  -- Persist the streak on the profile (source of truth, carries across seasons).
  update public.profiles
    set stats = stats
      || jsonb_build_object(
           'current_streak', p_new_current_streak,
           'best_streak', greatest(coalesce((stats->>'best_streak')::int, 0), p_new_best_streak),
           'last_played', v_play_date::text
         )
    where id = p_user;

  -- Re-rank every affected season.
  perform public.recompute_ranks(s) from unnest(v_seasons) as s;

  return jsonb_build_object('attempt_id', v_attempt_id, 'seasons', to_jsonb(v_seasons));
end;
$$;

-- ---------------------------------------------------------------------------
-- create_crew: create a crew league, its first season, membership, and standing.
-- ---------------------------------------------------------------------------
create or replace function public.create_crew(p_name text, p_invite_code text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
  v_season uuid;
  v_start  date := (now() at time zone 'utc')::date;
begin
  insert into public.leagues (type, name, invite_code, owner_id)
  values ('crew', p_name, p_invite_code, auth.uid())
  returning * into v_league;

  insert into public.seasons (league_id, name, starts_on, finals_starts_on, ends_on, status)
  values (
    v_league.id, 'Season 1',
    v_start,
    v_start + 28,                 -- 4-week regular season
    v_start + 28 + 6,             -- + 1-week finals
    'active'
  )
  returning id into v_season;

  insert into public.memberships (user_id, league_id, weight_class)
  values (auth.uid(), v_league.id, 'welterweight');

  insert into public.standings (season_id, league_id, user_id, weight_class)
  values (v_season, v_league.id, auth.uid(), 'welterweight');

  return v_league;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_by_code: join a crew by invite code; seeds membership + standing.
-- ---------------------------------------------------------------------------
create or replace function public.join_by_code(p_code text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
  v_season uuid;
  v_count  int;
begin
  select * into v_league from public.leagues where invite_code = upper(p_code) and type = 'crew';
  if v_league.id is null then raise exception 'invalid_code'; end if;

  select count(*) into v_count from public.memberships where league_id = v_league.id;
  if v_count >= v_league.capacity then raise exception 'league_full'; end if;

  insert into public.memberships (user_id, league_id, weight_class)
  values (auth.uid(), v_league.id, 'welterweight')
  on conflict (user_id, league_id) do nothing;

  select id into v_season from public.seasons
    where league_id = v_league.id and status in ('active','finals','upcoming')
    order by starts_on desc limit 1;

  if v_season is not null then
    insert into public.standings (season_id, league_id, user_id, weight_class)
    values (v_season, v_league.id, auth.uid(), 'welterweight')
    on conflict (season_id, user_id) do nothing;
  end if;

  return v_league;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_league
-- ---------------------------------------------------------------------------
create or replace function public.leave_league(p_league uuid)
returns void
language sql security definer set search_path = public as $$
  delete from public.memberships where league_id = p_league and user_id = auth.uid();
$$;

-- Lock down direct execution surface: only authenticated users can call.
grant execute on function public.start_attempt(uuid)        to authenticated;
grant execute on function public.create_crew(text, text)    to authenticated;
grant execute on function public.join_by_code(text)         to authenticated;
grant execute on function public.leave_league(uuid)         to authenticated;
-- commit_attempt + recompute_ranks are intended for the service role (Edge Functions) only.
revoke execute on function public.commit_attempt(uuid,uuid,boolean,numeric,int,int,int,int,int,int) from authenticated, anon;
