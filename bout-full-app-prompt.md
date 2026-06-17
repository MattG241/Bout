# Claude Code build prompt: BOUT (full app, iOS and Android)

Paste this into Claude Code in a fresh project directory. If `bout-proposal.md` is present, treat it as the source of truth and this as the build scope. This prompt is otherwise self-contained.

---

You are building the complete, production-ready, full-stack version of **Bout**, a cross-platform mobile app for **both iOS and Android**. Both platforms are first-class targets, build, test, and polish on each. Work incrementally, keep the app runnable at every milestone, use git and commit per milestone.

## What Bout is

A daily brain game you play against your mates. Everyone in a crew gets the same single puzzle each day, solves it in their own time, and their result feeds a season-long crew ladder with weight-class divisions, a finals week, and a fresh reset each season. The puzzle is the heartbeat. The crew league is the product.

The identity runs on a boxing / fight-card metaphor used throughout the copy: a daily game is a "bout", skill tiers are "weight classes", the finals are the "title bout", a win streak is going "undefeated", a crew is a "gym". Keep that language in the UI. The visual design, however, is minimal and stripped-back (see Design direction).

## The core daily loop

1. A push notification fires in a morning window (not a fixed-second alarm): today's bout is live.
2. The user opens it whenever suits and solves one puzzle. One to three minutes.
3. The server scores the attempt on accuracy and a small speed factor, applies a streak multiplier and an improvement bonus.
4. The user sees their score breakdown and their new position on the ladder.
5. They can share a result card.

One puzzle per day. No grinding extra rounds. This scarcity is a hard product rule.

## Full scope: build all of it

- **Auth and profile**: account creation, handle, basic profile and stats.
- **Crews**: create a crew, generate an invite link and code, join, manage members, leave.
- **Daily puzzle delivery**: server-authoritative, same puzzle for everyone, available in a daily window, date-gated so no one can fetch a future puzzle.
- **Full rotating puzzle roster**, one type per day across the week so different brains win on different days:
  - Word, Logic / deduction, Number / math, Visual / spatial, Memory, Trivia-lite (skill not obscure knowledge), and a harder weekend feature puzzle.
- **Solve and score**: submit flow, server-side answer validation, the full scoring formula, finals-week doubling.
- **Streaks**: consecutive-day tracking and the streak multiplier.
- **Live crew ladder**: realtime standings.
- **Full season system**: four-week regular season, a finals week (scores double), an off-season reset with a recap card, streaks carry across the reset.
- **Weight classes (divisions)**: skill tiers within a league, with promotion and relegation between seasons.
- **House leagues**: users without a crew are auto-assigned to a league of similar-skill strangers, with the same season, ladder, and division mechanics. This is also the soft landing for the cold-start problem.
- **Optional live race mode**: an opt-in, synchronous head-to-head on the day's puzzle for those who want the adrenaline. This is the only synchronous surface in the app and it is always optional.
- **Pick'em side-bet**: a daily one-tap "who tops your crew today" prediction worth a few points, adding a social and luck layer on top of skill.
- **Share cards**: daily result cards and end-of-season recap cards, rendered to image and shared via the native share sheet.
- **Push notifications**: the daily drop (windowed), plus finals and key-moment nudges.
- **Monetization (final layer, via RevenueCat)**: a season pass / premium tier (deeper stats, advanced puzzles, larger custom leagues, the ability to create your crew's own puzzles) and cosmetic / crew customization. Build this last and keep it cleanly separable.

## Hard exclusions (do not build)

- **No real-money stakes or wagering of any kind.** Stakes are pride, streaks, and forfeits only. Real-money wagering triggers gambling regulation, especially in Australia. Do not touch it.
- **No public feed, no followers, no algorithmic content discovery.** This is a closed competition among people who know each other, plus house leagues of matched strangers.

## Non-negotiable product rules (each drawn from a dead app)

1. The daily puzzle is async, available in a window, solved on the user's own schedule. No forced "drop everything now" moment. The opt-in live race is the only synchronous surface, and it is always optional.
2. One puzzle a day. No infinite play.
3. No pure-speed leaderboard. Speed is a minor tiebreaker only. Rotating types plus the scoring formula keep the ladder competitive for the whole crew.
4. No real-money stakes.
5. No public feed, followers, or algorithm.

## Tech stack (use this, do not deliberate)

- React Native with Expo, TypeScript, Expo Router. Build for both iOS and Android as first-class targets. Handle platform differences properly: APNs and FCM for push, safe areas, back-button behaviour on Android, and store-specific config.
- Supabase for backend: Postgres, Auth, Realtime, Edge Functions.
- Server-authoritative for anything competitive. The client never holds a puzzle solution before submission. Answer validation, timing, and scoring run server-side via Edge Functions or Postgres RPC.
- Expo push notifications across both platforms.
- Result cards rendered to image with react-native-view-shot or equivalent, shared via the native share sheet.
- Realtime channels for the live ladder and the live race mode.
- RevenueCat for the monetization layer.
- State: React state plus a light store (Zustand or context). Do not use any browser storage APIs.

## Data model

Use a generalised league concept so crews and house leagues share the same machinery. Postgres with row-level security:

- **users**: id, handle, created_at, push_token, entitlements, stats summary.
- **leagues**: id, type ('crew' or 'house'), name, invite_code (unique, nullable for house), owner_id (nullable for house), created_at.
- **memberships**: id, user_id, league_id, weight_class, joined_at.
- **seasons**: id, league_id, name, starts_on, ends_on, finals_starts_on, status (upcoming, active, finals, complete).
- **puzzles**: id, play_date, type, payload (jsonb), solution (jsonb, never sent to client pre-submission), difficulty.
- **attempts**: id, user_id, puzzle_id, season_id, completed, accuracy (0 to 1), time_ms, raw_score, streak_at_attempt, final_score, created_at.
- **standings**: id, season_id, user_id, total_points, rank, weight_class, played_count, current_streak, best_streak.
- **predictions**: id, user_id, season_id, play_date, predicted_top_user_id, resolved, points_awarded.
- **live_races**: id, puzzle_id, host_user_id, status, participants, results.
- **entitlements / purchases**: id, user_id, product, source, granted_at. (For the monetization layer.)

## Scoring formula (implement exactly, every constant in one tunable config object)

Per-attempt score, computed server-side:

- Completion base: 100 points for finishing.
- Accuracy: up to +100, scaled by efficiency. Perfect solve = +100, deduct per mistake or wasted guess down to a floor of 0.
- Speed: up to +25 only, and only as a minor edge. Map solve time within the day's reasonable range to 0 to 25. Keep it small so fast players cannot dominate.
- Streak multiplier: applied to the sum above. +2% per consecutive day played, capped at +30% (multiplier 1.0 to 1.3).
- Improvement bonus: +25 flat if today's pre-multiplier score beats the user's rolling 7-day average.

`final_score = round((completion + accuracy + speed + improvement) * streak_multiplier)`

Season points = sum of final_scores in the season. During finals week, final_scores double. Ladder ranks by season points within weight class. Put every constant in one config object so balance is trivial to tune later.

## Season and division structure

- Four-week regular season, then a one-week finals (scores double).
- After the season, a short off-season: the recap card becomes available, then a new season starts with points reset to zero. Streaks carry across the reset, do not punish loyal players.
- Weight classes are skill tiers within a league. At the end of each season, promote the top N and relegate the bottom N between adjacent tiers. Season one seeds everyone into a starting tier.
- House leagues run the identical season, ladder, and division logic, just with matched strangers instead of a known crew.

## Puzzle engine

- One puzzle per day, the same for everyone, served by date and gated server-side.
- Build the puzzle-type system as a pluggable interface. A type defines: generate, render payload, validate answer, and score accuracy. New types must drop in cleanly.
- Implement all seven types listed in scope. Generate each day's puzzle server-side.
- Before any puzzle is published, run a validator that confirms it has exactly one correct solution and is solvable. Never publish an ambiguous or unsolvable puzzle. A broken puzzle in a ranked game destroys trust instantly, so this gate is mandatory and must be enforced for every type.

## Screens

1. **Onboarding**: create or join a crew, or get matched into a house league. Set a handle. The first-run call to action is "bring your crew" with a frictionless invite link.
2. **Today**: the day's bout, current streak, play state, and the daily pick'em prompt. Home base.
3. **Play**: the puzzle itself, clean, timer running quietly in the background. No clutter.
4. **Result**: score breakdown (completion, accuracy, speed, streak multiplier, improvement), updated streak, pick'em outcome, and a one-tap share card.
5. **Ladder**: the live season standings, the user's rank and weight class, the finals picture. This is the emotional centre of the app, give it the most design attention. It reads like a clean results sheet.
6. **Season**: the arc, finals status, promotion and relegation picture, past seasons and winners.
7. **Crew**: members, invite controls, a light banter surface.
8. **Live race (optional)**: opt-in head-to-head lobby and race on the day's puzzle.
9. **Settings and profile**: handle, notifications, entitlements, the season pass.

## Design direction (BeReal-style: clean, modern, sleek, deliberately not AI-generated)

Identity: the stark, content-first minimalism of BeReal applied to a daily competition. Radical restraint. The interface gets out of the way. Confidence comes from simplicity and typography, never from decoration.

Surface and color:
- True near-black background everywhere, around #000000 to #0A0A0A. Not warm charcoal, not navy. Black.
- White and off-white text, high contrast.
- Near-monochrome. The palette is essentially black and white. Color is rationed, not sprayed.
- Exactly one accent, used only for the live state and the single primary action on a screen. The dominant impression must stay black and white. Pick one clean, modern accent and use it sparingly (a crisp green or a clean electric blue works, your choice, but restraint is the rule).
- Flat fills. No gradients. No pastels.

Typography:
- A clean, neutral, modern sans with a little character, the kind of unfussy typeface BeReal uses. Confident and simple, never a flashy display face.
- Tabular figures for every score, time, and standings number, so the ladder aligns like a clean sheet. Use a sans with tabular figures or a clean mono for data.
- Big, bold, simple type for the key moments (your score, the day's result, the ladder leader). Let type and negative space carry the design.

Form, layout, and motion:
- Content-first with generous negative space and minimal chrome. Every screen breathes.
- Tasteful rounded corners on cards and key surfaces, around 12 to 20px, BeReal-style. Do not pill-shape everything.
- Simple, thin, clean line icons. Nothing ornamental.
- The ladder is clean and legible: aligned numbers, clear hierarchy, like a well-set results sheet, not a busy dashboard.
- Motion is minimal, smooth, and purposeful. Clean transitions, nothing bouncy or decorative.

A deliberately honest, slightly raw simplicity is the goal, the same anti-polish polish BeReal has. Clean, not corporate. Sleek, not flashy.

Do NOT do any of these, they are the tells of a generic AI-generated app:
- No purple-to-blue, teal-to-pink, or any multi-stop gradients.
- No glassmorphism or frosted-glass cards.
- No max-rounded pill shapes on everything.
- No emoji in the UI.
- No centered hero with a glowing gradient blob behind it.
- No pastel palette.
- No bento-box grid of identical cards.
- No pile of soft drop shadows.
- No generic default-Inter-everywhere with no type consideration.
- No busy, over-decorated screens. When in doubt, remove rather than add.

## Build order (milestones, commit after each, keep both platforms running)

1. Scaffold the Expo + TypeScript project for iOS and Android. Set up Expo Router, the design tokens (the black-and-white system, type, spacing), and a small base component kit. Get a styled empty app running on both platforms.
2. Auth, handle, and profile.
3. Leagues: create a crew, invite code and link, join. House-league matching for solo users. First-run flow.
4. Postgres schema, RLS policies, and the server functions: date-gated daily puzzle delivery, server-side answer validation, the scoring RPC.
5. Puzzle engine: the pluggable type interface, all seven types, the daily rotation, and the mandatory pre-publish validator.
6. Play and Result screens: solve, submit, server scores, show the breakdown and updated streak.
7. Ladder and Season: live standings over Realtime, season start and end, finals-week doubling, weight classes with promotion and relegation, off-season reset and streak carryover.
8. Pick'em side-bet: daily prediction, resolution, points.
9. Share cards: result and recap cards rendered to image, native share.
10. Push notifications on both platforms: the windowed daily drop plus finals and key-moment nudges.
11. Live race mode: opt-in synchronous lobby and head-to-head over Realtime.
12. Monetization layer via RevenueCat: season pass and cosmetics, cleanly separable.
13. Store readiness: app icons, splash screens, store metadata, and build configs for both the App Store and Google Play.
14. Polish pass against the design direction, and a hard QA pass on the puzzle validator so no broken or ambiguous puzzle can ship in any type.

## Engineering guardrails

- Server-authoritative for puzzles, validation, timing, and scoring. The solution is never sent to the client before submission. Rate-limit submissions, reject duplicates.
- Invite codes are short, unique, and unguessable.
- Proper error and loading states everywhere. Never block the whole UI on a single request. Show data progressively.
- No browser storage APIs. Use proper native storage and React state.
- Handle both platforms properly throughout: push setup, permissions, safe areas, Android back behaviour, and store builds.
- Keep the puzzle type system and the monetization layer cleanly modular.

## Definition of done

A complete app, live on both iOS and Android, where:
- a real crew can install, join via invite, and a solo user can be matched into a house league,
- everyone receives a daily push and solves the day's bout,
- attempts are scored server-side with streaks, the pick'em resolves, and the live ladder updates in realtime,
- seasons run start to finish with weight-class divisions, promotion and relegation, a finals week that doubles scores, and an off-season reset with a shareable recap card,
- the optional live race mode works head-to-head,
- the season pass and cosmetics are purchasable,
- everything runs server-authoritative with no cheating holes and no broken puzzles, and the app is ready to submit to both stores.
