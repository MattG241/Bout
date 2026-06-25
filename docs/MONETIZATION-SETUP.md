# Bout — Season Pass setup (pricing + exact steps)

The app side is fully wired (paywall, purchase/restore, server-authoritative entitlements, the
`revenuecat-webhook`, and a real "Deeper stats" unlock). This is the dashboard config to turn it
on. The app reads whatever plans you create — no code changes needed once the keys are set.

---

## Recommended pricing

| Plan | Price (USD) | Product ID | Notes |
|---|---|---|---|
| **Season Pass — Monthly** | **$4.99 / month** | `bout_season_pass_monthly` | auto-renew, 1 month |
| **Season Pass — Annual** | **$29.99 / year** | `bout_season_pass_annual` | auto-renew, 1 year — ~50% cheaper than monthly; make this the headline |

- **Entitlement name (must match the app):** `season_pass`
- **Optional:** add a **7-day free trial** introductory offer on the annual plan — it reliably
  lifts conversions for a habit app like this.
- The stores auto-convert to local currencies (e.g. ~A$7.99 / ~A$49.99 in Australia). You set the
  base US price; they pick the matching local tier.
- **Fees:** enrol in the **Apple Small Business Program** and **Google's reduced service fee** so
  the store cut is **15%** (not 30%) while you're under US$1M/year.

Premium unlocks **depth, never an advantage**: deeper stats, advanced puzzles, larger custom
crews, create-your-own bouts, and cosmetics. The daily bout and the ladder stay free for everyone.

---

## STEP 1 — App Store Connect (iOS)
1. **My Apps → Bout → Subscriptions** (Monetization → Subscriptions).
2. Create a **Subscription Group**: "Bout Season Pass".
3. **Add subscription** → Reference name "Season Pass Monthly", **Product ID `bout_season_pass_monthly`**, duration **1 month**, price **$4.99**. Add a localized display name + description.
4. **Add subscription** → "Season Pass Annual", **Product ID `bout_season_pass_annual`**, duration **1 year**, price **$29.99**. (Optional: add a **7-day free trial** introductory offer.)
5. Both subscriptions go in the **same group** (so they're upgrade/downgrade of each other).
6. Generate an **App-Specific Shared Secret** (App → App Information → or use an App Store Connect API key) — you'll paste it into RevenueCat.

## STEP 2 — Google Play Console (Android)
1. **Monetize → Products → Subscriptions → Create subscription.**
2. **Product ID `season_pass`** with two **base plans**:
   - `monthly` — auto-renewing, **1 month**, **$4.99**.
   - `annual` — auto-renewing, **1 year**, **$29.99**. (Optional: add a free-trial offer.)
3. **Activate** both base plans.
4. **Setup → API access** → create/link a **Google Cloud service account** with access, and download its JSON key for RevenueCat.

## STEP 3 — RevenueCat
1. Create a project "Bout".
2. **Add app → iOS**: bundle id `com.bout.app`; paste the App Store Shared Secret (or ASC API key).
3. **Add app → Android**: package `com.bout.app`; upload the Play service-account JSON.
4. **Entitlements → +New** → identifier **`season_pass`**.
5. **Products** → import your store products (the two iOS subscriptions + the two Android base plans) and **attach all four to the `season_pass` entitlement**.
6. **Offerings** → create offering **`default`** → add two packages:
   - **Monthly** → the monthly products
   - **Annual** → the annual products
7. **API Keys** → copy the **public** iOS key (`appl_…`) and Android key (`goog_…`). *(These are publishable — safe to share with me.)*
8. **Integrations → Webhooks → +New**:
   - URL: `https://fklltgfczcxegijwdeax.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: a long random string you choose.

## STEP 4 — Connect it to the app
1. Tell me the two public keys (`appl_…`, `goog_…`) and I'll set them in `app.json` `extra`. Or do it yourself:
   ```json
   "revenueCatApiKeyIos": "appl_XXXX",
   "revenueCatApiKeyAndroid": "goog_XXXX"
   ```
2. Store the webhook secret so the server trusts RevenueCat's events:
   ```bash
   npx supabase secrets set REVENUECAT_WEBHOOK_AUTH="<the same random string from Step 3.8>"
   ```
3. Rebuild (`npx eas-cli build …`). Done — the paywall shows your live plans and prices, purchases
   unlock premium instantly, and the webhook keeps entitlements server-authoritative.

> Test with a **sandbox / internal-testing** account before going live. RevenueCat's "Sandbox"
> mode + an App Store sandbox tester (or a Play internal-test license) lets you run a real
> purchase end-to-end without being charged.
