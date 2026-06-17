-- No-repeats guarantee for the daily puzzle: every published puzzle records a canonical
-- fingerprint, and the publisher refuses to ship a puzzle whose fingerprint already exists.
alter table public.puzzles add column if not exists fingerprint text;

-- Enforce global uniqueness of shipped puzzles at the database level too.
create unique index if not exists puzzles_fingerprint_key on public.puzzles (fingerprint)
  where fingerprint is not null;
