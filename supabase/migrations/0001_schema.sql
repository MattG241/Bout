-- BOUT schema. Generalised "league" concept so crews and house leagues share machinery.
-- Postgres + RLS. The puzzle SOLUTION is isolated in its own table with no client access.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users / profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text unique not null check (char_length(handle) between 3 and 20),
  created_at   timestamptz not null default now(),
  push_token   text,
  push_platform text check (push_platform in ('ios','android')),
  entitlements jsonb not null default '{}'::jsonb,
  stats        jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Leagues (crew | house)
-- ---------------------------------------------------------------------------
create table if not exists public.leagues (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('crew','house')),
  name        text not null,
  invite_code text unique,                              -- null for house leagues
  owner_id    uuid references public.profiles (id) on delete set null, -- null for house
  capacity    int not null default 50,
  created_at  timestamptz not null default now()
);
create index if not exists leagues_invite_code_idx on public.leagues (invite_code);

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  league_id    uuid not null references public.leagues (id) on delete cascade,
  weight_class text not null default 'welterweight',
  joined_at    timestamptz not null default now(),
  unique (user_id, league_id)
);
create index if not exists memberships_league_idx on public.memberships (league_id);
create index if not exists memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues (id) on delete cascade,
  name             text not null,
  starts_on        date not null,
  ends_on          date not null,
  finals_starts_on date not null,
  status           text not null default 'upcoming'
                    check (status in ('upcoming','active','finals','complete')),
  created_at       timestamptz not null default now()
);
create index if not exists seasons_league_idx on public.seasons (league_id);

-- ---------------------------------------------------------------------------
-- Puzzles. The global daily puzzle (one per play_date). Payload is client-safe.
-- ---------------------------------------------------------------------------
create table if not exists public.puzzles (
  id          uuid primary key default gen_random_uuid(),
  play_date   date not null unique,
  type        text not null,
  difficulty  text not null,
  payload     jsonb not null,            -- client-safe: NEVER contains the answer
  speed_window jsonb,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists puzzles_play_date_idx on public.puzzles (play_date);

-- Solutions live apart from payload so RLS can deny all client access to answers.
create table if not exists public.puzzle_solutions (
  puzzle_id uuid primary key references public.puzzles (id) on delete cascade,
  solution  jsonb not null
);

-- Server-authoritative timing: when a user first opened today's puzzle.
create table if not exists public.attempt_sessions (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  puzzle_id  uuid not null references public.puzzles (id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);

-- ---------------------------------------------------------------------------
-- Attempts (one per user per puzzle — duplicates rejected by the unique key)
-- ---------------------------------------------------------------------------
create table if not exists public.attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  puzzle_id         uuid not null references public.puzzles (id) on delete cascade,
  season_id         uuid references public.seasons (id) on delete set null,
  league_id         uuid references public.leagues (id) on delete set null,
  completed         boolean not null,
  accuracy          numeric(4,3) not null check (accuracy between 0 and 1),
  time_ms           int not null,
  raw_score         int not null,        -- pre-multiplier sum
  streak_at_attempt int not null,
  final_score       int not null,
  created_at        timestamptz not null default now(),
  unique (user_id, puzzle_id)
);
create index if not exists attempts_season_idx on public.attempts (season_id);
create index if not exists attempts_user_idx on public.attempts (user_id);

-- ---------------------------------------------------------------------------
-- Standings (live ladder rows; one per user per season)
-- ---------------------------------------------------------------------------
create table if not exists public.standings (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references public.seasons (id) on delete cascade,
  league_id      uuid not null references public.leagues (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  total_points   int not null default 0,
  rank           int,
  weight_class   text not null default 'welterweight',
  played_count   int not null default 0,
  current_streak int not null default 0,
  best_streak    int not null default 0,
  updated_at     timestamptz not null default now(),
  unique (season_id, user_id)
);
create index if not exists standings_season_idx on public.standings (season_id);
create index if not exists standings_league_idx on public.standings (league_id);

-- ---------------------------------------------------------------------------
-- Pick'em predictions
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  league_id            uuid not null references public.leagues (id) on delete cascade,
  season_id            uuid references public.seasons (id) on delete set null,
  play_date            date not null,
  predicted_top_user_id uuid not null references public.profiles (id) on delete cascade,
  resolved             boolean not null default false,
  correct              boolean,
  points_awarded       int not null default 0,
  created_at           timestamptz not null default now(),
  unique (user_id, league_id, play_date)
);
create index if not exists predictions_resolve_idx on public.predictions (play_date, resolved);

-- ---------------------------------------------------------------------------
-- Live race (the only synchronous, always-optional surface)
-- ---------------------------------------------------------------------------
create table if not exists public.live_races (
  id           uuid primary key default gen_random_uuid(),
  puzzle_id    uuid not null references public.puzzles (id) on delete cascade,
  league_id    uuid references public.leagues (id) on delete set null,
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'lobby' check (status in ('lobby','racing','finished','cancelled')),
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

create table if not exists public.live_race_participants (
  race_id    uuid not null references public.live_races (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  finished_at timestamptz,
  time_ms    int,
  accuracy   numeric(4,3),
  place      int,
  primary key (race_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Purchases / entitlements (monetization layer; cleanly separable)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product    text not null,
  source     text not null default 'revenuecat',
  granted_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists purchases_user_idx on public.purchases (user_id);
