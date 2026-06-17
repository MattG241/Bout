import { describe, it, expect } from 'vitest';
import { actualDayWinner, resolvePredictions } from './pickem';
import { PICKEM } from './config';

describe('actualDayWinner', () => {
  it('is the highest day score', () => {
    expect(
      actualDayWinner([
        { userId: 'a', dayScore: 120 },
        { userId: 'b', dayScore: 240 },
        { userId: 'c', dayScore: 0 },
      ]),
    ).toBe('b');
  });
  it('null when nobody played', () => {
    expect(actualDayWinner([{ userId: 'a', dayScore: 0 }])).toBeNull();
  });
  it('breaks ties deterministically by id', () => {
    expect(
      actualDayWinner([
        { userId: 'z', dayScore: 100 },
        { userId: 'a', dayScore: 100 },
      ]),
    ).toBe('a');
  });
});

describe('resolvePredictions', () => {
  const results = [
    { userId: 'a', dayScore: 120 },
    { userId: 'b', dayScore: 240 },
  ];
  it('awards points for a correct pick', () => {
    const [r] = resolvePredictions([{ userId: 'x', predictedTopUserId: 'b' }], results);
    expect(r!.correct).toBe(true);
    expect(r!.pointsAwarded).toBe(PICKEM.correctReward);
  });
  it('awards nothing for a wrong pick', () => {
    const [r] = resolvePredictions([{ userId: 'x', predictedTopUserId: 'a' }], results);
    expect(r!.correct).toBe(false);
    expect(r!.pointsAwarded).toBe(0);
  });
});
