# Bout backend (Supabase)

Server-authoritative Postgres + Auth + Realtime + Edge Functions. The client never holds a
puzzle solution before submission; validation, timing, and scoring are all server-side.

## Layout

- `migrations/` — schema, RLS, RPCs, and scheduled jobs (applied in order).
  - `0001_schema.sql` — tables. **Solutions live in `puzzle_solutions`, isolated from `puzzles`.**
  - `0002_rls.sql` — row-level security. `puzzle_solutions` and `attempt_sessions` have **no
    client policies**, so answers and timing can only be touched by `SECURITY DEFINER` functions.
  - `0003_functions.sql` — `start_attempt` (timing), `commit_attempt` (atomic, duplicate-safe
    persistence + standings), `recompute_ranks`, `create_crew`, `join_by_code`, `leave_league`.
  - `0004_cron.sql` — pg_cron schedules for publish/push/pickem/rollover.
- `functions/` — Deno Edge Functions. Game **math** is the shared, unit-tested core, bundled to
  `functions/_shared/core.mjs` by `npm run build:edge-core`.
  - `publish-daily-puzzle` — generate + **mandatory validator** + publish today (+buffer).
  - `submit-attempt` — load puzzle+solution, validate, server-time, score, commit.
  - `resolve-pickem` — resolve daily predictions, award points.
  - `season-rollover` — finals open/close, promotion/relegation, off-season reset, next season.
  - `match-house-league` — cold-start matching into a house league.
  - `send-daily-push` — windowed morning drop + finals nudges (Expo push → APNs & FCM).
  - `finalize-race` — rank the optional live race.

## Why the solution can't leak

`puzzles.payload` is the only thing RLS lets a client read (and only when `published` and
`play_date <= today`). The answer is in `puzzle_solutions`, which has RLS enabled and **zero
policies** — unreachable with an anon/auth JWT. Only Edge Functions using the service role read it.

## Deploy

```bash
supabase link --project-ref <ref>
supabase db push                       # apply migrations
npm run build:edge-core                # bundle the shared core for Deno
supabase functions deploy              # deploy all functions
# Set secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Store the service role key in Vault as `service_role_key` for the cron jobs.
```
