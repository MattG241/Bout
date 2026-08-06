/**
 * Timezone-aware day math. The daily bout is a single global puzzle per calendar date, but
 * "today" and "morning" are resolved in each user's LOCAL timezone (Wordle-style): everyone
 * who plays their local June 18 solves the same June 18 puzzle. Uses Intl, which is available
 * in all our runtimes (Hermes on device, Deno in Edge Functions, Node in tests).
 */

/** The user's local calendar date as `YYYY-MM-DD` in the given IANA timezone. */
export function localDate(timezone: string, now: Date = new Date()): string {
  try {
    // en-CA formats as ISO-like YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    // Unknown timezone → fall back to UTC date.
    return now.toISOString().slice(0, 10);
  }
}

/** The user's local hour (0–23) in the given IANA timezone. */
export function localHour(timezone: string, now: Date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(now);
    return parseInt(h, 10) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/** Is it currently within [startHour, endHour) local time for this timezone? */
export function isWithinLocalWindow(timezone: string, startHour: number, endHour: number, now: Date = new Date()): boolean {
  const h = localHour(timezone, now);
  return h >= startHour && h < endHour;
}

/** Best-effort device timezone (safe in RN/Hermes). Falls back to UTC. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
