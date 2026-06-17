import { describe, it, expect } from 'vitest';
import { nextStreak, streakIsAlive, rollingAverage } from './streaks';

describe('nextStreak', () => {
  it('first ever play → 1', () => {
    expect(nextStreak({ previousStreak: 0, lastPlayedDate: null, today: '2026-06-17' })).toBe(1);
  });
  it('consecutive day → +1', () => {
    expect(nextStreak({ previousStreak: 4, lastPlayedDate: '2026-06-16', today: '2026-06-17' })).toBe(5);
  });
  it('gap of 2+ days → resets to 1', () => {
    expect(nextStreak({ previousStreak: 9, lastPlayedDate: '2026-06-14', today: '2026-06-17' })).toBe(1);
  });
  it('same day replay does not inflate the streak', () => {
    expect(nextStreak({ previousStreak: 4, lastPlayedDate: '2026-06-17', today: '2026-06-17' })).toBe(4);
  });
  it('handles month/year boundaries', () => {
    expect(nextStreak({ previousStreak: 3, lastPlayedDate: '2025-12-31', today: '2026-01-01' })).toBe(4);
  });
});

describe('streakIsAlive', () => {
  it('alive if last play was today or yesterday', () => {
    expect(streakIsAlive('2026-06-17', '2026-06-17')).toBe(true);
    expect(streakIsAlive('2026-06-16', '2026-06-17')).toBe(true);
  });
  it('dead after a missed day', () => {
    expect(streakIsAlive('2026-06-15', '2026-06-17')).toBe(false);
    expect(streakIsAlive(null, '2026-06-17')).toBe(false);
  });
});

describe('rollingAverage', () => {
  it('null when empty', () => expect(rollingAverage([], 7)).toBeNull());
  it('averages the last N', () => {
    expect(rollingAverage([100, 200, 300], 7)).toBe(200);
    expect(rollingAverage([0, 0, 0, 90, 90, 90, 90, 90, 90, 90], 7)).toBe(90);
  });
});
