// The competitive heart: server-authoritative solve scoring.
// Flow: auth → load puzzle+solution (service role, client never saw the answer) →
// validate the submission and compute accuracy with the shared core → measure time from
// the server-stamped serve → compute streak + score with the core → commit atomically.
// deno-lint-ignore-file no-explicit-any
import {
  validateSubmission,
  scoreAttempt,
  nextStreak,
  rollingAverage,
  SCORING,
} from '../_shared/core.mjs';
import { serviceClient, requireUser, json, errorResponse } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const { userId } = await requireUser(req);
    const { puzzleId, submission } = await req.json();
    if (!puzzleId) return errorResponse('puzzleId required');

    const db = serviceClient();

    // 1) Load the puzzle (date-gated) + its protected solution.
    const { data: puzzle, error: pErr } = await db
      .from('puzzles')
      .select('id, play_date, type, difficulty, payload, speed_window, published')
      .eq('id', puzzleId)
      .single();
    if (pErr || !puzzle) return errorResponse('unknown_puzzle', 404);
    // Allow play_date up to UTC "tomorrow" so users in timezones ahead of UTC (e.g. Australia)
    // can submit their local-today bout. This matches the RLS read-gate and start_attempt, which
    // both allow play_date <= (UTC date + 1). A strict-UTC gate here wrongly rejected those users.
    const utcCutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!puzzle.published || puzzle.play_date > utcCutoff) return errorResponse('puzzle_not_available', 403);

    const { data: sol, error: sErr } = await db
      .from('puzzle_solutions')
      .select('solution')
      .eq('puzzle_id', puzzleId)
      .single();
    if (sErr || !sol) return errorResponse('solution_missing', 500);

    // 2) Reject duplicates early (also enforced by the unique index in commit_attempt).
    const { data: existing } = await db
      .from('attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .maybeSingle();
    if (existing) return errorResponse('already_attempted', 409);

    // 3) Server-authoritative timing: elapsed from the stamped serve time.
    const { data: session } = await db
      .from('attempt_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('puzzle_id', puzzleId)
      .maybeSingle();
    const startedAt = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
    const timeMs = Math.max(0, Date.now() - startedAt);

    // 4) Validate + score with the SAME core logic the client uses (no drift).
    const validation = validateSubmission(
      { type: puzzle.type, difficulty: puzzle.difficulty, payload: puzzle.payload, solution: sol.solution } as any,
      submission,
    );

    // 5) Streak + rolling average from history (carry across seasons).
    const { data: profile } = await db.from('profiles').select('stats').eq('id', userId).single();
    const prevStreak = Number(profile?.stats?.current_streak ?? 0);
    const lastPlayed = (profile?.stats?.last_played as string | undefined) ?? null;
    const newStreak = validation.completed
      ? nextStreak({ previousStreak: prevStreak, lastPlayedDate: lastPlayed, today: puzzle.play_date })
      : prevStreak;
    const newBest = Math.max(Number(profile?.stats?.best_streak ?? 0), newStreak);

    const { data: recent } = await db
      .from('attempts')
      .select('raw_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(SCORING.improvementWindowDays);
    const avg = rollingAverage((recent ?? []).map((r: any) => r.raw_score).reverse(), SCORING.improvementWindowDays);

    const breakdown = scoreAttempt({
      completed: validation.completed,
      accuracy: validation.accuracy,
      timeMs,
      streakDays: newStreak,
      rollingAverage: avg,
      speedWindow: puzzle.speed_window ?? undefined,
      // Finals doubling is applied per-season in commit_attempt; base score stays clean here.
    });

    // 6) Commit atomically (duplicate-safe) and update every league standing.
    const { data: committed, error: cErr } = await db.rpc('commit_attempt', {
      p_user: userId,
      p_puzzle: puzzleId,
      p_completed: validation.completed,
      p_accuracy: validation.accuracy,
      p_time_ms: timeMs,
      p_raw_score: breakdown.preMultiplier,
      p_streak_at_attempt: newStreak,
      p_final_score: breakdown.finalScore,
      p_new_current_streak: newStreak,
      p_new_best_streak: newBest,
    });
    if (cErr) {
      if (cErr.message?.includes('already_attempted')) return errorResponse('already_attempted', 409);
      throw cErr;
    }

    return json({
      ok: true,
      attemptId: (committed as any)?.attempt_id,
      validation: { detail: validation.detail },
      breakdown,
      streak: { current: newStreak, best: newBest },
      timeMs,
    });
  } catch (e) {
    const msg = (e as Error).message;
    return errorResponse(msg, msg === 'unauthorized' ? 401 : 500);
  }
});
