import { describe, it, expect } from 'vitest';
import {
  buildSeasonWindow,
  seasonStatusOn,
  isFinalsDay,
  rankStandings,
  computeDivisionChanges,
  resetForNewSeason,
  seedStandings,
  nextSeasonStart,
  type StandingRow,
} from './season';
import { SEASON, SEED_WEIGHT_CLASS } from './config';

describe('season window', () => {
  const w = buildSeasonWindow('2026-06-01');
  it('regular season is 4 weeks then finals week', () => {
    expect(w.startsOn).toBe('2026-06-01');
    expect(w.finalsStartsOn).toBe('2026-06-29'); // +28 days
    expect(w.endsOn).toBe('2026-07-05'); // finals week last day
  });
  it('status transitions', () => {
    expect(seasonStatusOn(w, '2026-05-31')).toBe('upcoming');
    expect(seasonStatusOn(w, '2026-06-10')).toBe('active');
    expect(seasonStatusOn(w, '2026-06-29')).toBe('finals');
    expect(seasonStatusOn(w, '2026-07-05')).toBe('finals');
    expect(seasonStatusOn(w, '2026-07-06')).toBe('complete');
  });
  it('isFinalsDay matches finals window', () => {
    expect(isFinalsDay(w, '2026-06-28')).toBe(false);
    expect(isFinalsDay(w, '2026-06-30')).toBe(true);
  });
  it('next season starts after the off-season', () => {
    expect(nextSeasonStart(w)).toBe('2026-07-08'); // endsOn + offSeasonDays(2) + 1
  });
});

describe('rankStandings', () => {
  it('ranks within weight class by points, then games, then streak', () => {
    const rows: StandingRow[] = [
      { userId: 'a', weightClass: 'lightweight', totalPoints: 300, playedCount: 5, currentStreak: 2, bestStreak: 2 },
      { userId: 'b', weightClass: 'lightweight', totalPoints: 300, playedCount: 7, currentStreak: 1, bestStreak: 3 },
      { userId: 'c', weightClass: 'lightweight', totalPoints: 500, playedCount: 6, currentStreak: 6, bestStreak: 6 },
      { userId: 'd', weightClass: 'heavyweight', totalPoints: 100, playedCount: 1, currentStreak: 1, bestStreak: 1 },
    ];
    const ranked = rankStandings(rows);
    const lw = ranked.filter((r) => r.weightClass === 'lightweight').sort((x, y) => x.rank - y.rank);
    expect(lw.map((r) => r.userId)).toEqual(['c', 'b', 'a']); // c highest points; b beats a on games played
    expect(ranked.find((r) => r.userId === 'd')!.rank).toBe(1); // separate class
  });
});

describe('promotion / relegation', () => {
  it('promotes top N up and relegates bottom N down', () => {
    // 8 players in welterweight (middle tier). Top 3 promoted, bottom 3 relegated.
    const rows: StandingRow[] = Array.from({ length: 8 }, (_, i) => ({
      userId: `u${i}`,
      weightClass: 'welterweight',
      totalPoints: 1000 - i * 100, // u0 highest … u7 lowest
      playedCount: 10,
      currentStreak: 1,
      bestStreak: 1,
    }));
    const ranked = rankStandings(rows);
    const changes = computeDivisionChanges(ranked);
    const promoted = changes.filter((c) => c.direction === 'promoted').map((c) => c.userId).sort();
    const relegated = changes.filter((c) => c.direction === 'relegated').map((c) => c.userId).sort();
    expect(promoted).toEqual(['u0', 'u1', 'u2']);
    expect(relegated).toEqual(['u5', 'u6', 'u7']);
    expect(changes.find((c) => c.userId === 'u0')!.to).toBe('middleweight');
    expect(changes.find((c) => c.userId === 'u7')!.to).toBe('lightweight');
  });

  it('top of the heaviest class cannot be promoted further', () => {
    const rows: StandingRow[] = Array.from({ length: 5 }, (_, i) => ({
      userId: `h${i}`,
      weightClass: 'heavyweight',
      totalPoints: 1000 - i * 100,
      playedCount: 10,
      currentStreak: 1,
      bestStreak: 1,
    }));
    const changes = computeDivisionChanges(rankStandings(rows));
    expect(changes.find((c) => c.userId === 'h0')!.to).toBe('heavyweight');
    expect(changes.find((c) => c.userId === 'h0')!.direction).toBe('stay');
  });

  it('bottom of the lightest class cannot be relegated further', () => {
    const rows: StandingRow[] = Array.from({ length: 5 }, (_, i) => ({
      userId: `f${i}`,
      weightClass: 'flyweight',
      totalPoints: 1000 - i * 100,
      playedCount: 10,
      currentStreak: 1,
      bestStreak: 1,
    }));
    const changes = computeDivisionChanges(rankStandings(rows));
    expect(changes.find((c) => c.userId === 'f4')!.to).toBe('flyweight');
  });
});

describe('off-season reset', () => {
  it('zeroes points but carries streaks across the reset', () => {
    const rows: StandingRow[] = [
      { userId: 'a', weightClass: 'welterweight', totalPoints: 999, playedCount: 20, currentStreak: 12, bestStreak: 30 },
    ];
    const ranked = rankStandings(rows);
    const changes = computeDivisionChanges(ranked);
    const reset = resetForNewSeason(ranked, changes);
    expect(reset[0]!.totalPoints).toBe(0);
    expect(reset[0]!.playedCount).toBe(0);
    expect(reset[0]!.currentStreak).toBe(12); // carried
    expect(reset[0]!.bestStreak).toBe(30); // carried
  });
});

describe('season-one seeding', () => {
  it('seeds everyone into the middle tier', () => {
    const seeded = seedStandings(['a', 'b', 'c']);
    expect(seeded.every((s) => s.weightClass === SEED_WEIGHT_CLASS)).toBe(true);
    expect(seeded.every((s) => s.totalPoints === 0)).toBe(true);
  });
  it('uses configured season length', () => {
    expect(SEASON.regularSeasonWeeks).toBe(4);
    expect(SEASON.finalsWeeks).toBe(1);
  });
});
