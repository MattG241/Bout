// The windowed daily drop, now timezone-aware. Runs hourly; for each user it sends only when
// it is currently their local morning window AND they haven't already had today's drop. This
// keeps "today's bout is live" a genuine morning nudge for a global audience — never a fixed
// UTC alarm, never twice in a day. Uses Expo push (APNs + FCM).
// deno-lint-ignore-file no-explicit-any
import { localDate, isWithinLocalWindow, PUSH } from '../_shared/core.mjs';
import { serviceClient, json, errorResponse } from '../_shared/util.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(messages: any[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const db = serviceClient();
    const body = await req.json().catch(() => ({}));
    const kind: 'daily' | 'finals' = body.kind ?? 'daily';
    const now = new Date();

    const { data: users } = await db
      .from('profiles')
      .select('id, push_token, timezone, stats')
      .not('push_token', 'is', null);

    const messages: any[] = [];
    const toMark: Array<{ id: string; stats: any; localDay: string }> = [];

    for (const u of users ?? []) {
      const tz = u.timezone || 'UTC';
      // Only fire in the user's local morning window.
      if (!isWithinLocalWindow(tz, PUSH.dropWindowStartHour, PUSH.dropWindowEndHour, now)) continue;

      const localDay = localDate(tz, now);
      // De-dupe: at most one drop per local day.
      if (u.stats?.last_drop_date === localDay) continue;

      // Is there a published puzzle for this user's local day?
      const { data: puzzle } = await db.from('puzzles').select('id, type').eq('play_date', localDay).maybeSingle();
      if (!puzzle) continue;

      const title = kind === 'finals' ? 'Title bout — finals week' : "Today's bout is live";
      const subtitle =
        kind === 'finals' ? 'Scores double this week. Make it count.' : 'One puzzle. Your crew is waiting.';

      messages.push({
        to: u.push_token,
        sound: 'default',
        title,
        body: subtitle,
        data: { type: kind, playDate: localDay, puzzleId: puzzle.id },
        channelId: 'daily-drop',
      });
      toMark.push({ id: u.id, stats: u.stats ?? {}, localDay });
    }

    await sendExpoPush(messages);

    // Record that we sent today's drop so the next hourly run won't double-send.
    for (const m of toMark) {
      await db
        .from('profiles')
        .update({ stats: { ...m.stats, last_drop_date: m.localDay } })
        .eq('id', m.id);
    }

    return json({ ok: true, sent: messages.length, kind });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
