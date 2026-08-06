import { describe, it, expect } from 'vitest';
import {
  scoreAttempt,
  speedPoints,
  accuracyPoints,
  streakMultiplier,
  improvementPoints,
} from './scoring';
import { SCORING } from './config';

describe('streakMultiplier', () => {
  it('day 1 has no bonus (base multiplier)', () => {
    expect(streakMultiplier(1)).toBe(1.0);
    expect(streakMultiplier(0)).toBe(1.0);
  });
  it('adds +2% per consecutive day', () => {
    expect(streakMultiplier(2)).toBeCloseTo(1.02);
    expect(streakMultiplier(6)).toBeCloseTo(1.1);
  });
  it('caps at +30%', () => {
    expect(streakMultiplier(16)).toBeCloseTo(1.3);
    expect(streakMultiplier(100)).toBe(SCORING.streak.max);
  });
});

describe('accuracyPoints', () => {
  it('perfect solve = +100', () => expect(accuracyPoints(1)).toBe(100));
  it('zero accuracy = 0', () => expect(accuracyPoints(0)).toBe(0));
  it('clamps out-of-range input', () => {
    expect(accuracyPoints(2)).toBe(100);
    expect(accuracyPoints(-1)).toBe(0);
  });
});

describe('speedPoints', () => {
  it('is capped at speedMax', () => {
    expect(speedPoints(0)).toBe(SCORING.speedMax);
    expect(speedPoints(1)).toBeLessThanOrEqual(SCORING.speedMax);
  });
  it('is zero past the slow bound', () => {
    expect(speedPoints(10_000_000)).toBe(0);
  });
  it('decreases monotonically with time', () => {
    const a = speedPoints(25_000);
    const b = speedPoints(60_000);
    const c = speedPoints(110_000);
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(c);
  });
  it('never lets speed dominate the score (rule #3)', () => {
    expect(SCORING.speedMax).toBeLessThan(SCORING.accuracyMax);
  });
});

describe('improvementPoints', () => {
  it('no history → no bonus', () => expect(improvementPoints(200, null)).toBe(0));
  it('beats average → bonus', () => expect(improvementPoints(210, 200)).toBe(SCORING.improvementBonus));
  it('ties average → no bonus (strict)', () => expect(improvementPoints(200, 200)).toBe(0));
});

describe('scoreAttempt', () => {
  it('incomplete attempt scores zero', () => {
    const r = scoreAttempt({ completed: false, accuracy: 1, timeMs: 1000, streakDays: 5, rollingAverage: null });
    expect(r.finalScore).toBe(0);
    expect(r.preMultiplier).toBe(0);
  });

  it('flawless fast first-day solve = completion + accuracy + speed, no streak/improvement', () => {
    const r = scoreAttempt({
      completed: true,
      accuracy: 1,
      timeMs: 0,
      streakDays: 1,
      rollingAverage: null,
    });
    expect(r.completion).toBe(100);
    expect(r.accuracy).toBe(100);
    expect(r.speed).toBe(SCORING.speedMax);
    expect(r.improvement).toBe(0);
    expect(r.streakMultiplier).toBe(1);
    expect(r.finalScore).toBe(100 + 100 + SCORING.speedMax);
  });

  it('applies the formula exactly: round((c+a+s+i) * mult)', () => {
    const r = scoreAttempt({
      completed: true,
      accuracy: 0.5,
      timeMs: 0,
      streakDays: 6, // +10%
      rollingAverage: 0, // beats it → +25
    });
    const pre = 100 + 50 + SCORING.speedMax + SCORING.improvementBonus;
    expect(r.preMultiplier).toBe(pre);
    expect(r.finalScore).toBe(Math.round(pre * 1.1));
  });

  it('doubles during finals week', () => {
    const base = scoreAttempt({ completed: true, accuracy: 1, timeMs: 0, streakDays: 1, rollingAverage: null });
    const finals = scoreAttempt({
      completed: true,
      accuracy: 1,
      timeMs: 0,
      streakDays: 1,
      rollingAverage: null,
      isFinals: true,
    });
    expect(finals.finalsApplied).toBe(true);
    expect(finals.finalScore).toBe(base.finalScore * 2);
  });

  it('streak multiplier cannot exceed cap even with huge streak', () => {
    const r = scoreAttempt({ completed: true, accuracy: 1, timeMs: 0, streakDays: 999, rollingAverage: null });
    expect(r.streakMultiplier).toBe(SCORING.streak.max);
  });
});
