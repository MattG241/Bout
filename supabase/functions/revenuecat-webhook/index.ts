// RevenueCat webhook → server-authoritative entitlements.
// RC posts subscription lifecycle events; we verify a shared secret, then upsert the
// purchases table and mirror active entitlements onto profiles.entitlements so the server
// (not just the client SDK) is the source of truth for who has premium.
//
// Configure in RevenueCat: Webhook URL = .../revenuecat-webhook, Authorization header =
// the value of the REVENUECAT_WEBHOOK_AUTH secret. We set RC's app_user_id = the Supabase
// user id at configure() time, so events map straight to our users.
// deno-lint-ignore-file no-explicit-any
import { serviceClient, json, errorResponse } from '../_shared/util.ts';

const GRANTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE']);
const REVOKES = new Set(['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  try {
    // Verify the shared secret RevenueCat sends in the Authorization header.
    const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
    if (expected && req.headers.get('Authorization') !== expected) return errorResponse('forbidden', 403);

    const body = await req.json();
    const event = body?.event ?? body;
    const userId: string | undefined = event?.app_user_id;
    const type: string = event?.type ?? '';
    const entitlementIds: string[] = event?.entitlement_ids ?? (event?.entitlement_id ? [event.entitlement_id] : []);
    if (!userId) return errorResponse('missing app_user_id');

    const db = serviceClient();

    if (GRANTS.has(type)) {
      const expires = event?.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
      for (const product of entitlementIds.length ? entitlementIds : [event?.product_id ?? 'season_pass']) {
        await db.from('purchases').insert({
          user_id: userId,
          product,
          source: 'revenuecat',
          expires_at: expires,
        });
      }
    }

    // Recompute the active set from non-expired purchases and mirror onto the profile.
    const { data: active } = await db
      .from('purchases')
      .select('product, expires_at')
      .eq('user_id', userId);
    const now = Date.now();
    const activeProducts = Array.from(
      new Set(
        (active ?? [])
          .filter((p: any) => !p.expires_at || new Date(p.expires_at).getTime() > now)
          .map((p: any) => p.product),
      ),
    );
    // On a revoke event, drop entitlements whose latest purchase has lapsed.
    const entitlements: Record<string, boolean> = {};
    for (const p of activeProducts) entitlements[p] = true;

    await db.from('profiles').update({ entitlements }).eq('id', userId);

    return json({ ok: true, type, entitlements: activeProducts });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
