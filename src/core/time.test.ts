import { describe, it, expect } from 'vitest';
import { localDate, localHour, isWithinLocalWindow } from './time';

// A fixed instant: 2026-06-17T23:30:00Z. In Sydney (UTC+10) it's already the 18th, 09:30.
const instant = new Date('2026-06-17T23:30:00Z');

describe('localDate', () => {
  it('rolls the date forward for timezones ahead of UTC', () => {
    expect(localDate('UTC', instant)).toBe('2026-06-17');
    expect(localDate('Australia/Sydney', instant)).toBe('2026-06-18');
  });
  it('stays behind for timezones behind UTC', () => {
    expect(localDate('America/Los_Angeles', instant)).toBe('2026-06-17');
  });
  it('falls back to UTC for a bad timezone', () => {
    expect(localDate('Not/AZone', instant)).toBe('2026-06-17');
  });
});

describe('localHour', () => {
  it('reports the correct local hour', () => {
    expect(localHour('UTC', instant)).toBe(23);
    expect(localHour('Australia/Sydney', instant)).toBe(9); // +10
  });
});

describe('isWithinLocalWindow', () => {
  it('is true during the local morning window', () => {
    expect(isWithinLocalWindow('Australia/Sydney', 8, 10, instant)).toBe(true); // 09:30 local
    expect(isWithinLocalWindow('UTC', 8, 10, instant)).toBe(false); // 23:30 local
  });
});
