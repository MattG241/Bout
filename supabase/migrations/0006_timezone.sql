-- Per-user timezone so "today's bout" and the morning push resolve in local time.
alter table public.profiles add column if not exists timezone text not null default 'UTC';

-- Relax the puzzle date gate by one day. Timezones run up to UTC+14, so a user's local
-- date can be at most one day ahead of the UTC date; they must be able to fetch it. The
-- publisher publishes today + tomorrow (still never a genuinely future puzzle for anyone).
drop policy if exists puzzles_date_gated_select on public.puzzles;
create policy puzzles_date_gated_select on public.puzzles
  for select using (
    published = true
    and play_date <= ((now() at time zone 'utc')::date + 1)
  );
