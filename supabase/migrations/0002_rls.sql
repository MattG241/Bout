-- Row-level security. Default deny; explicit grants. Competitive data is server-authoritative.
-- The puzzle SOLUTION and attempt_sessions tables get NO authenticated policies at all,
-- so the answer and the timing record can only ever be touched by SECURITY DEFINER functions
-- / the service role. This is the spine of "the client never holds the solution".

alter table public.profiles               enable row level security;
alter table public.leagues                enable row level security;
alter table public.memberships            enable row level security;
alter table public.seasons                enable row level security;
alter table public.puzzles                enable row level security;
alter table public.puzzle_solutions       enable row level security;
alter table public.attempt_sessions       enable row level security;
alter table public.attempts               enable row level security;
alter table public.standings              enable row level security;
alter table public.predictions            enable row level security;
alter table public.live_races             enable row level security;
alter table public.live_race_participants enable row level security;
alter table public.purchases              enable row level security;

-- Helper: is the current user a member of a league?
create or replace function public.is_league_member(p_league uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.league_id = p_league and m.user_id = auth.uid()
  );
$$;

-- Helper: leagues the current user shares with another user (for visibility of handles).
create or replace function public.shares_league(p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.league_id = me.league_id
    where me.user_id = auth.uid() and them.user_id = p_user
  );
$$;

-- ---- profiles ----
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.shares_league(id));
create policy profiles_self_upsert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- leagues ----
-- Members see their leagues. Anyone may look up a crew by its invite code (to join).
create policy leagues_member_select on public.leagues
  for select using (public.is_league_member(id) or invite_code is not null);
create policy leagues_owner_insert on public.leagues
  for insert with check (owner_id = auth.uid() and type = 'crew');
create policy leagues_owner_update on public.leagues
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---- memberships ----
create policy memberships_visible on public.memberships
  for select using (user_id = auth.uid() or public.is_league_member(league_id));
create policy memberships_join on public.memberships
  for insert with check (user_id = auth.uid());
create policy memberships_leave on public.memberships
  for delete using (user_id = auth.uid());

-- ---- seasons ----
create policy seasons_member_select on public.seasons
  for select using (public.is_league_member(league_id));

-- ---- puzzles ----
-- Date-gated: a client may only read a puzzle that is published AND whose play_date is
-- not in the future. No one can fetch tomorrow's bout. (Solution is in another table.)
create policy puzzles_date_gated_select on public.puzzles
  for select using (published = true and play_date <= (now() at time zone 'utc')::date);

-- ---- puzzle_solutions ----  (no policies → no authenticated access at all)

-- ---- attempt_sessions ----  (no policies → server-only timing)

-- ---- attempts ----
-- A user can read their own attempts and those of people in their leagues (the ladder).
create policy attempts_visible on public.attempts
  for select using (user_id = auth.uid() or (league_id is not null and public.is_league_member(league_id)));
-- Inserts go ONLY through the SECURITY DEFINER commit function, never directly.

-- ---- standings ----
create policy standings_member_select on public.standings
  for select using (public.is_league_member(league_id));

-- ---- predictions ----
create policy predictions_self_select on public.predictions
  for select using (user_id = auth.uid() or public.is_league_member(league_id));
create policy predictions_self_insert on public.predictions
  for insert with check (user_id = auth.uid() and public.is_league_member(league_id));

-- ---- live races ----
create policy live_races_member_select on public.live_races
  for select using (league_id is null or public.is_league_member(league_id));
create policy live_races_host_insert on public.live_races
  for insert with check (host_user_id = auth.uid());
create policy live_races_host_update on public.live_races
  for update using (host_user_id = auth.uid());
create policy lrp_select on public.live_race_participants
  for select using (
    exists (select 1 from public.live_races r where r.id = race_id and (r.league_id is null or public.is_league_member(r.league_id)))
  );
create policy lrp_self_join on public.live_race_participants
  for insert with check (user_id = auth.uid());
create policy lrp_self_update on public.live_race_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- purchases ----
create policy purchases_self_select on public.purchases
  for select using (user_id = auth.uid());
