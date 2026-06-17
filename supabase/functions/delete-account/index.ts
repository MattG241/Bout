// In-app account deletion (App Store guideline 5.1.1(v) / Play Data-safety requirement).
// Deletes the auth user; every owned row cascades away via ON DELETE CASCADE
// (profile → memberships, attempts, standings, predictions, sessions, race entries, purchases).
// Crews the user owned have owner_id set to null rather than being destroyed for their members.
import { serviceClient, requireUser, json, errorResponse } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    const { userId } = await requireUser(req);
    const db = serviceClient();

    // Explicitly clear the profile first (defensive; FK cascade also covers this), then the
    // auth user, which cascades the rest.
    await db.from('profiles').delete().eq('id', userId);
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw error;

    return json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    return errorResponse(msg, msg === 'unauthorized' ? 401 : 500);
  }
});
