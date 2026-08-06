import { describe, it, expect } from 'vitest';
import { generateInviteCode, isValidInviteCode, inviteLink, matchHouseLeague } from './leagues';

describe('invite codes', () => {
  it('are 6 chars from the unambiguous alphabet', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(isValidInviteCode(code)).toBe(true);
    expect(code).not.toMatch(/[O0I1L]/);
  });
  it('are deterministic given the rng (and effectively unique across draws)', () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const codes = new Set(Array.from({ length: 2000 }, () => generateInviteCode(rand)));
    expect(codes.size).toBeGreaterThan(1990); // overwhelmingly unique
  });
  it('rejects malformed codes', () => {
    expect(isValidInviteCode('ABC')).toBe(false);
    expect(isValidInviteCode('ABC0EF')).toBe(false); // contains 0
  });
  it('builds a deep link', () => {
    expect(inviteLink('ABC234')).toBe('https://bout.app/join/ABC234');
  });
});

describe('house-league matching', () => {
  it('prefers a same-tier league with room', () => {
    const id = matchHouseLeague(
      [
        { leagueId: 'full', weightClass: 'welterweight', memberCount: 20, capacity: 20 },
        { leagueId: 'same', weightClass: 'welterweight', memberCount: 5, capacity: 20 },
        { leagueId: 'other', weightClass: 'flyweight', memberCount: 1, capacity: 20 },
      ],
      'welterweight',
    );
    expect(id).toBe('same');
  });
  it('falls back to the emptiest league with room when no same-tier match', () => {
    const id = matchHouseLeague(
      [
        { leagueId: 'a', weightClass: 'flyweight', memberCount: 10, capacity: 20 },
        { leagueId: 'b', weightClass: 'heavyweight', memberCount: 2, capacity: 20 },
      ],
      'welterweight',
    );
    expect(id).toBe('b');
  });
  it('returns null (create new) when everything is full', () => {
    const id = matchHouseLeague([
      { leagueId: 'a', weightClass: 'welterweight', memberCount: 20, capacity: 20 },
    ]);
    expect(id).toBeNull();
  });
});
