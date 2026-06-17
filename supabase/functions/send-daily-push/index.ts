// Scheduled: the windowed daily drop. Fires in a morning window (not a fixed-second alarm)
// to everyone with a push token, telling them today's bout is live. Also sends finals and
// key-moment nudges. Uses the Expo push service (works for both APNs and FCM).
// deno-lint-ignore-file no-explicit-any
import { serviceClient, json, errorResponse, utcToday } from '../_shared/util.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(messages: any[]): Promise<void> {
  // Expo accepts batches of up to 100.
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
    const today = utcToday();

    // Is today a finals day for any league? (Drives the finals nudge copy.)
    const { data: puzzle } = await db.from('puzzles').select('id, type').eq('play_date', today).maybeSingle();
    if (!puzzle && kind === 'daily') return json({ ok: true, sent: 0, reason: 'no puzzle today' });

    const { data: users } = await db
      .from('profiles')
      .select('id, push_token, handle')
      .not('push_token', 'is', null);

    const title = kind === 'finals' ? 'Title bout — finals week' : "Today's bout is live";
    const subtitle =
      kind === 'finals'
        ? 'Scores double this week. Make it count.'
        : 'One puzzle. Your crew is waiting.';

    const messages = (users ?? []).map((u: any) => ({
      to: u.push_token,
      sound: 'default',
      title,
      body: subtitle,
      data: { type: kind, playDate: today, puzzleId: puzzle?.id },
      // A small jitter window is achieved by the scheduler firing within the morning band;
      // we deliberately do NOT pin a second so it never feels like a "drop everything" alarm.
      channelId: 'daily-drop',
    }));

    await sendExpoPush(messages);
    return json({ ok: true, sent: messages.length, kind });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
