# Bout — Launch progress tracker

Last updated: 2026-06-25. Legend: ✅ done · 👉 **you are here** · ⬜ to do.

Key IDs (for reference):
- Bundle / package: `com.bout.app`
- Apple App Store Connect App ID (ascAppId): `6784204484` · Apple team: `DNS7GY854U` ("Matthew Groves", NOT the Individual/Ryderwear team `ULZZSDF2JC`)
- EAS project: `@mattg241/bout` (`98565089-854e-444a-9088-69d8373ef221`)
- RevenueCat entitlement: `season_pass` · offering: `default`
- iOS products: `bout_season_pass_monthly` ($4.99), `bout_season_pass_annual` ($29.99) + 7-day trial
- Android subscription: `season_pass` with base plans `monthly` ($4.99) + `annual` ($29.99) + offer `free-trial-7d`
- Supabase webhook: `https://fklltgfczcxegijwdeax.supabase.co/functions/v1/revenuecat-webhook`

---

## Shared monetization backend
- ✅ RevenueCat iOS app (In-App Purchase `.p8` key), products, `season_pass` entitlement, `default` offering
- ✅ App wired with iOS key `appl_…` (in `app.json`)
- ✅ `revenuecat-webhook` Edge Function deployed + `REVENUECAT_WEBHOOK_AUTH` secret set
- ✅ Privacy policy hosted (GitHub Pages) + embedded in-app

## iOS
- ✅ App ID registered (`com.bout.app`, push + associated domains)
- ✅ App Store Connect app created (`6784204484`)
- ✅ App Privacy / data collection declared
- ✅ Subscriptions: monthly $4.99, annual $29.99, 7-day trial
- ✅ App Store Connect API key (Bout account) wired into `eas.json` for submit
- ✅ EAS production build + **submitted to TestFlight** (1.0.0 (1)) — uploaded OK
- ⬜ Wait for Apple processing → build appears in TestFlight (paused here for now)
- ⬜ Add yourself as internal tester → install via TestFlight app on iPhone
- ⬜ **Sandbox purchase test** — buy Season Pass, confirm premium unlocks (App Store → RevenueCat → webhook → app)
- ⬜ Complete store listing (screenshots, description, keywords, support URL)
- ⬜ Submit for App Review

## Android
- ✅ Play Console app created (`com.bout.app`)
- ✅ EAS production build (`.aab`)
- ✅ Uploaded to **Internal testing** (live to internal testers)
- ✅ Subscription `season_pass`: `monthly` ($4.99) + `annual` ($29.99) base plans + `free-trial-7d` offer
- 👉 **Step 5 — Google Play service account** (so RevenueCat can verify Android purchases):
      Play Console → Setup → API access → create service account in Google Cloud → download JSON →
      grant it "View app info", "View financial data", "Manage orders & subscriptions".
- ⬜ Step 6 — RevenueCat: add **Google Play** app (`com.bout.app`), upload the service-account JSON,
      import products `season_pass:monthly` + `season_pass:annual`, attach both to the `season_pass`
      entitlement, add Monthly + Annual packages to the `default` offering, copy the **`goog_…`** key.
- ⬜ Step 7 — Wire the `goog_…` key into `app.json` *(Claude does this)*.
- ⬜ Step 8 — Android push: add Firebase `google-services.json` + wire `android.googleServicesFile`
      and the FCM credential in EAS *(Claude wires the config; you provide the Firebase file)*.
- ⬜ Step 9 — Rebuild Android (`eas build -p android`) with the key + push, re-upload to internal testing.
- ⬜ Step 10 — Install on an Android phone (Testers opt-in link) + **sandbox purchase test**.
- ⬜ Complete Play store listing (graphics, data safety, content rating) + submit for review.

---

### How to resume
Open this file, find 👉, and tell Claude "continue from the launch tracker." Dashboard config lives in
`docs/MONETIZATION-SETUP.md`; build/submit notes in `docs/MAC-BUILD-SUBMIT.md`.
