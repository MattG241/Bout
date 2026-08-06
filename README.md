# Bout

A daily brain game you play against your mates. Everyone in a crew gets the same single
puzzle each day, solves it on their own schedule, and their result feeds a season-long crew
ladder with weight-class divisions, a finals week, and a fresh reset each season. The puzzle
is the heartbeat; the crew league is the product.

Cross-platform (iOS + Android) React Native / Expo app with a server-authoritative Supabase
backend. Identity runs on a boxing / fight-card metaphor; the visual design is stark,
content-first black-and-white (BeReal-style restraint) with a single rationed accent.

## Stack

- **App**: React Native + Expo (SDK 54) + TypeScript + Expo Router. iOS & Android first-class.
- **Backend**: Supabase — Postgres, Auth, Realtime, Edge Functions. Server-authoritative for
  everything competitive. The client never holds a puzzle solution before submission.
- **Shared core**: `src/core` is pure, dependency-free TypeScript (scoring, puzzles, seasons).
  The exact same code runs on the client and, bundled, inside the Edge Functions — zero drift.
- **Push**: Expo notifications (APNs + FCM). **Monetization**: RevenueCat (cleanly separable).

## Layout

```
src/core/        Pure game logic (config, scoring, streaks, seasons, pick'em, leagues, puzzles)
src/design/      Design tokens (the black-and-white system)
src/components/  Base UI kit + share card + icons
src/play/        Per-type puzzle play renderers behind one registry
src/lib/         Supabase client, typed api boundary, notifications, sharing, monetization
src/hooks/       Bootstrap, today, standings
app/             Expo Router screens (auth flow, tabs, play, result, race)
supabase/        migrations (schema, RLS, RPCs, cron) + Edge Functions
scripts/         edge-core bundler + asset generator
```

## The daily loop

1. A windowed morning push: today's bout is live.
2. Open it whenever, solve one puzzle (1–3 min).
3. The server validates the answer, times the solve, and scores it (accuracy + minor speed),
   applies the streak multiplier and improvement bonus, doubles during finals.
4. See the breakdown and your new ladder position.
5. Share a result card.

One puzzle a day. No grinding. No pure-speed leaderboard. No real-money stakes. No public feed.

## Scoring

`final_score = round((completion + accuracy + speed + improvement) * streak_multiplier)`,
doubled during finals week. Every constant lives in one tunable object: `src/core/config.ts`.

## Develop

```bash
npm install
npm test            # 77 unit tests incl. a 365-day puzzle-validator QA gate
npm run typecheck
npm start           # Expo dev server (press i / a for iOS / Android)
```

Set `extra.supabaseUrl` / `extra.supabaseAnonKey` in `app.json` (or EAS env) to point at a
project. See `supabase/README.md` for backend deploy. See `store/metadata.md` for listings.

## Guarantees worth calling out

- **No broken puzzles ship.** Every daily puzzle is generated deterministically and passes a
  mandatory pre-publish validator proving exactly one solution. Tested across 365+ days.
- **No cheating holes.** Solutions live in a table with zero client-readable RLS policies;
  validation, timing, and scoring are all server-side; duplicate submissions are rejected.
- **No pay-to-win.** The daily bout, the ladder, and fairness are always free. Premium only
  adds depth and cosmetics.
