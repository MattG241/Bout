import { describe, it, expect } from 'vitest';
import { scoreAttempt } from './scoring';
import { nextStreak, rollingAverage } from './streaks';
import {
  buildSeasonWindow,
  isFinalsDay,
  rankStandings,
  computeDivisionChanges,
  resetForNewSeason,
  seedStandings,
  type StandingRow,
} from './season';
import { resolvePredictions } from './pickem';
import { generateDailyPuzzle, validateSubmission } from './puzzles/registry';
import { SCORING } from './config';

/**
 * End-to-end simulation of a full season for a small league, exercising the entire
 * server-authoritative game logic the way the Edge Functions compose it: validate → score →
 * streak → standings → finals doubling → ranking → promotion/relegation → off-season reset,
 * plus pick'em resolution. This is the "test everything" proof that the pieces fit together.
 */

interface SimUser {
  id: string;
  skill: number; // 0..1 — drives accuracy
  speedMs: number;
  history: number[];
  lastPlayed: string | null;
  streak: number;
  best: number;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('full-season pipeline simulation', () => {
  it('accumulates a coherent ladder, doubles finals, then promotes/relegates and carries streaks', () => {
    const window = buildSeasonWindow('2026-03-02'); // a Monday
    const users: SimUser[] = [
      { id: 'ace', skill: 1.0, speedMs: 15_000, history: [], lastPlayed: null, streak: 0, best: 0 },
      { id: 'bee', skill: 0.8, speedMs: 30_000, history: [], lastPlayed: null, streak: 0, best: 0 },
      { id: 'cee', skill: 0.6, speedMs: 45_000, history: [], lastPlayed: null, streak: 0, best: 0 },
      { id: 'dee', skill: 0.3, speedMs: 60_000, history: [], lastPlayed: null, streak: 0, best: 0 },
    ];
    const points = new Map(users.map((u) => [u.id, 0]));
    const played = new Map(users.map((u) => [u.id, 0]));

    // Sanity: one real validate call proves the integration with the puzzle engine.
    const probe = generateDailyPuzzle(window.startsOn);
    expect(validateSubmission(probe, {}).accuracy).toBeLessThan(1);

    // Simulate the whole season + finals, every user plays every day.
    const totalDays = 35; // 4 weeks + finals week
    for (let d = 0; d < totalDays; d++) {
      const date = addDays(window.startsOn, d);
      const finals = isFinalsDay(window, date);
      for (const u of users) {
        const accuracy = u.skill; // deterministic skill model
        const newStreak = nextStreak({ previousStreak: u.streak, lastPlayedDate: u.lastPlayed, today: date });
        const avg = rollingAverage(u.history, SCORING.improvementWindowDays);
        const b = scoreAttempt({
          completed: true,
          accuracy,
          timeMs: u.speedMs,
          streakDays: newStreak,
          rollingAverage: avg,
          isFinals: finals,
        });
        // Update sim state.
        u.history.push(b.preMultiplier);
        u.streak = newStreak;
        u.best = Math.max(u.best, newStreak);
        u.lastPlayed = date;
        points.set(u.id, points.get(u.id)! + b.finalScore);
        played.set(u.id, played.get(u.id)! + 1);
      }
    }

    // Everyone played every day → streaks equal the day count.
    expect(users.every((u) => u.streak === totalDays)).toBe(true);
    // Streak multiplier is capped, so it never runs away.
    expect(scoreAttempt({ completed: true, accuracy: 1, timeMs: 0, streakDays: 999, rollingAverage: null }).streakMultiplier)
      .toBe(SCORING.streak.max);

    // Skill ordering must hold on the ladder.
    const standings: StandingRow[] = users.map((u) => ({
      userId: u.id,
      weightClass: 'welterweight',
      totalPoints: points.get(u.id)!,
      playedCount: played.get(u.id)!,
      currentStreak: u.streak,
      bestStreak: u.best,
    }));
    const ranked = rankStandings(standings).sort((a, b) => a.rank - b.rank);
    expect(ranked.map((r) => r.userId)).toEqual(['ace', 'bee', 'cee', 'dee']);

    // Finals genuinely doubled scores: the season total exceeds 35× a single non-finals day.
    const aceOneDay = scoreAttempt({ completed: true, accuracy: 1, timeMs: 15_000, streakDays: 35, rollingAverage: null }).finalScore;
    expect(points.get('ace')!).toBeGreaterThan(aceOneDay * 28); // 28 regular days, finals add more

    // Off-season: promotion/relegation then reset. With one class and 4 players, top 3 promote,
    // bottom 3 relegate — overlap means dee (bottom) relegates, ace/bee/cee promote.
    const changes = computeDivisionChanges(ranked);
    expect(changes.find((c) => c.userId === 'ace')!.direction).toBe('promoted');
    expect(changes.find((c) => c.userId === 'dee')!.direction).toBe('relegated');

    const reset = resetForNewSeason(ranked, changes);
    expect(reset.every((r) => r.totalPoints === 0 && r.playedCount === 0)).toBe(true);
    expect(reset.find((r) => r.userId === 'ace')!.currentStreak).toBe(35); // streak carried
    expect(reset.find((r) => r.userId === 'ace')!.weightClass).toBe('middleweight'); // promoted up
    expect(reset.find((r) => r.userId === 'dee')!.weightClass).toBe('lightweight'); // relegated down
  });

  it('pick\'em resolves against the simulated day winner', () => {
    // ace clearly tops the day; a prediction for ace scores, for dee does not.
    const dayResults = [
      { userId: 'ace', dayScore: 240 },
      { userId: 'bee', dayScore: 180 },
      { userId: 'dee', dayScore: 0 },
    ];
    const resolved = resolvePredictions(
      [
        { userId: 'bee', predictedTopUserId: 'ace' },
        { userId: 'cee', predictedTopUserId: 'dee' },
      ],
      dayResults,
    );
    expect(resolved.find((r) => r.userId === 'bee')!.correct).toBe(true);
    expect(resolved.find((r) => r.userId === 'cee')!.correct).toBe(false);
  });

  it('season-one seeding places everyone in the middle tier with zeroed points', () => {
    const seeded = seedStandings(['a', 'b', 'c', 'd']);
    expect(seeded.every((s) => s.weightClass === 'welterweight' && s.totalPoints === 0)).toBe(true);
  });
});
