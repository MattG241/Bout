/**
 * Season & division engine — pure logic for ranking, finals, promotion/relegation,
 * and the off-season reset. Identical for crew leagues and house leagues.
 */

import { SEASON, WEIGHT_CLASSES, SEED_WEIGHT_CLASS, type WeightClass } from './config';

export type SeasonStatus = 'upcoming' | 'active' | 'finals' | 'complete';

export interface SeasonWindow {
  startsOn: string; // YYYY-MM-DD inclusive
  endsOn: string; // last day of finals, inclusive
  finalsStartsOn: string; // first day scores double
}

const MS_PER_DAY = 86_400_000;
function dayNum(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / MS_PER_DAY);
}
function addDays(iso: string, days: number): string {
  const next = new Date(dayNum(iso) * MS_PER_DAY + days * MS_PER_DAY);
  return next.toISOString().slice(0, 10);
}

/** Build the canonical 4-week season + 1-week finals window from a start date. */
export function buildSeasonWindow(startsOn: string): SeasonWindow {
  const regularDays = SEASON.regularSeasonWeeks * 7;
  const finalsStartsOn = addDays(startsOn, regularDays);
  const endsOn = addDays(finalsStartsOn, SEASON.finalsWeeks * 7 - 1);
  return { startsOn, finalsStartsOn, endsOn };
}

/** When does the next season start (after the off-season)? */
export function nextSeasonStart(window: SeasonWindow): string {
  return addDays(window.endsOn, SEASON.offSeasonDays + 1);
}

export function seasonStatusOn(window: SeasonWindow, today: string): SeasonStatus {
  const t = dayNum(today);
  if (t < dayNum(window.startsOn)) return 'upcoming';
  if (t > dayNum(window.endsOn)) return 'complete';
  if (t >= dayNum(window.finalsStartsOn)) return 'finals';
  return 'active';
}

export function isFinalsDay(window: SeasonWindow, today: string): boolean {
  return seasonStatusOn(window, today) === 'finals';
}

// ---- Standings & ranking ----

export interface StandingRow {
  userId: string;
  weightClass: WeightClass;
  totalPoints: number;
  playedCount: number;
  currentStreak: number;
  bestStreak: number;
}

export interface RankedRow extends StandingRow {
  rank: number; // 1-based within the weight class
}

/**
 * Rank within each weight class by points desc. Ties broken by games played (more = higher,
 * rewards consistency), then by current streak. Pure and stable.
 */
export function rankStandings(rows: StandingRow[]): RankedRow[] {
  const byClass = new Map<WeightClass, StandingRow[]>();
  for (const row of rows) {
    const list = byClass.get(row.weightClass) ?? [];
    list.push(row);
    byClass.set(row.weightClass, list);
  }
  const out: RankedRow[] = [];
  for (const [, list] of byClass) {
    const sorted = [...list].sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.playedCount - a.playedCount ||
        b.currentStreak - a.currentStreak ||
        a.userId.localeCompare(b.userId),
    );
    sorted.forEach((row, i) => out.push({ ...row, rank: i + 1 }));
  }
  return out;
}

// ---- Promotion / relegation ----

function classIndex(wc: WeightClass): number {
  return WEIGHT_CLASSES.indexOf(wc);
}
function higherClass(wc: WeightClass): WeightClass {
  const i = classIndex(wc);
  return WEIGHT_CLASSES[Math.min(WEIGHT_CLASSES.length - 1, i + 1)]!;
}
function lowerClass(wc: WeightClass): WeightClass {
  const i = classIndex(wc);
  return WEIGHT_CLASSES[Math.max(0, i - 1)]!;
}

export interface DivisionChange {
  userId: string;
  from: WeightClass;
  to: WeightClass;
  direction: 'promoted' | 'relegated' | 'stay';
}

/**
 * End-of-season promotion/relegation: top N of each class go up, bottom N go down.
 * Edge classes (heaviest/lightest) can't move further out. Returns one entry per user.
 */
export function computeDivisionChanges(finalRanked: RankedRow[]): DivisionChange[] {
  const byClass = new Map<WeightClass, RankedRow[]>();
  for (const r of finalRanked) {
    const list = byClass.get(r.weightClass) ?? [];
    list.push(r);
    byClass.set(r.weightClass, list);
  }

  const changes: DivisionChange[] = [];
  for (const [wc, list] of byClass) {
    const sorted = [...list].sort((a, b) => a.rank - b.rank);
    const size = sorted.length;
    sorted.forEach((row, i) => {
      const isTop = i < SEASON.promoteTopN;
      const isBottom = i >= size - SEASON.relegateBottomN;
      let to: WeightClass = wc;
      let direction: DivisionChange['direction'] = 'stay';
      if (isTop && wc !== WEIGHT_CLASSES[WEIGHT_CLASSES.length - 1]) {
        to = higherClass(wc);
        direction = 'promoted';
      } else if (isBottom && wc !== WEIGHT_CLASSES[0]) {
        to = lowerClass(wc);
        direction = 'relegated';
      }
      // Don't both promote and relegate a tiny class; promotion wins for the top.
      changes.push({ userId: row.userId, from: wc, to, direction });
    });
  }
  return changes;
}

/**
 * Off-season reset: points → 0, played → 0, ranks cleared. Streaks CARRY over (loyalty).
 * Returns the seed rows for the new season at the user's (possibly changed) weight class.
 */
export function resetForNewSeason(
  ranked: RankedRow[],
  changes: DivisionChange[],
): StandingRow[] {
  const newClass = new Map(changes.map((c) => [c.userId, c.to]));
  return ranked.map((r) => ({
    userId: r.userId,
    weightClass: newClass.get(r.userId) ?? r.weightClass,
    totalPoints: 0,
    playedCount: 0,
    currentStreak: r.currentStreak, // carried across the reset
    bestStreak: r.bestStreak,
  }));
}

/** Season-one seeding: everyone starts in the same middle tier. */
export function seedStandings(userIds: string[]): StandingRow[] {
  return userIds.map((userId) => ({
    userId,
    weightClass: SEED_WEIGHT_CLASS,
    totalPoints: 0,
    playedCount: 0,
    currentStreak: 0,
    bestStreak: 0,
  }));
}
