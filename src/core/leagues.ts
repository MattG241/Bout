/**
 * League helpers — invite codes and house-league matching. Pure logic.
 */

import type { WeightClass } from './config';
import { SEED_WEIGHT_CLASS } from './config';

// Unambiguous alphabet: no 0/O, 1/I/L to keep codes easy to read and share.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Short, unguessable invite code. `rand` injectable for deterministic tests. */
export function generateInviteCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return code.split('').every((ch) => CODE_ALPHABET.includes(ch));
}

/** Build a shareable deep link for an invite code. */
export function inviteLink(code: string, base = 'https://bout.app'): string {
  return `${base}/join/${code}`;
}

export interface HouseLeagueCandidate {
  leagueId: string;
  weightClass: WeightClass;
  memberCount: number;
  capacity: number;
}

/**
 * Match a solo user into a house league of similar-skill strangers (cold-start soft landing).
 * Prefer a league at the user's tier with room; otherwise the emptiest league with room;
 * null means "create a new house league".
 */
export function matchHouseLeague(
  candidates: HouseLeagueCandidate[],
  userWeightClass: WeightClass = SEED_WEIGHT_CLASS,
): string | null {
  const withRoom = candidates.filter((c) => c.memberCount < c.capacity);
  if (withRoom.length === 0) return null;

  const sameTier = withRoom
    .filter((c) => c.weightClass === userWeightClass)
    .sort((a, b) => b.memberCount - a.memberCount); // fill nearly-full ones first to keep leagues lively
  if (sameTier.length > 0) return sameTier[0]!.leagueId;

  return withRoom.sort((a, b) => a.memberCount - b.memberCount)[0]!.leagueId;
}
