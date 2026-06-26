# Bout — Launch progress tracker

Last updated: 2026-06-25. Legend: ✅ done · 👉 **you are here** · ⬜ to do.

> ✅ **Timezone submit fix — DEPLOYED & verified.** `submit-attempt` now allows play_date <= UTC+1,
> so users ahead of UTC (Australia etc.) can submit their local-today bout. Confirmed working on device.

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
- ✅ Subscription `season_pass`: `monthly` ($4.99) + `annual` ($29.99) base plans + `free-trial-7d` offer
- ✅ Google Play service account (`bout-642@…`) created + permissions granted + uploaded to RevenueCat
- ✅ RevenueCat Google Play app, products (`season_pass:monthly`/`:annual`), entitlement + offering
- ✅ `goog_…` key wired into `app.json`
- ✅ Rebuilt with the key + timezone fix, uploaded to Internal testing, installed on device
- ✅ **Sandbox purchase VERIFIED on device** — Season Pass buy → premium unlocked 🎉
- ✅ Android push (FCM): Firebase project `bout-5bab5`, `google-services.json` committed, FCM V1 key in EAS
- 👉 **Rebuild Android** (now includes google-services.json) → upload to Internal testing → update on phone → **send a test push** to verify a notification lands
- ⬜ Complete Play store listing (graphics, data safety, content rating, target audience) + submit for review

## Path to launch (both platforms, after the above)
- ⬜ iOS: install latest TestFlight build → sandbox purchase test → (optional) fresh build to match latest client code
- ⬜ Store listings: screenshots (have generators in `scripts/`), descriptions (`store/metadata.md`), privacy URL (live), age/content rating, data safety
- ⬜ Submit both apps for review → once approved, release to production
- ⚠️ Android only: complete **Android developer verification** before public production (does not block testing)

---

### How to resume
Open this file, find 👉, and tell Claude "continue from the launch tracker." Dashboard config lives in
`docs/MONETIZATION-SETUP.md`; build/submit notes in `docs/MAC-BUILD-SUBMIT.md`.
