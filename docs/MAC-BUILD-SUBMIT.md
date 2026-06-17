# Bout — Build & Submit Runbook (Mac, copy-paste)

Picks up after the backend is live and the app runs in Expo Go. This takes you to real,
installable apps and then to the App Store / Google Play. Run blocks in **Terminal** inside
`~/Desktop/Bout`. **(browser)** = do it on a website.

> The free path (test on Android) needs no paid accounts. iOS and store submission need:
> **Apple Developer** ($99/yr) and **Google Play Developer** ($25 once).

---

## STAGE 5 — Set up EAS (Expo's build service) ⏱ ~10 min
```bash
cd ~/Desktop/Bout
npm install -g eas-cli
eas login
eas init
```
- `eas login` → use your Expo account (free, make one at expo.dev if needed).
- `eas init` → creates/links an EAS project and writes its id into `app.json`. Say **yes** to
  creating the project. This id is also what powers push notifications later.
- If it asks to commit the `app.json` change, say yes (or just continue — it'll include it).

✅ Done when `eas init` prints a project URL.

---

## STAGE 6 — A real test build on Android (free, no accounts) ⏱ ~20 min
This gives you an installable APK to try the native app (sharing, haptics, sound — everything
except push/purchases, which need the later stages).
```bash
eas build --profile preview --platform android
```
- First time, it asks to generate an Android keystore → say **yes** (EAS manages it).
- The build runs on Expo's servers (~10–15 min). When done it prints a **link + QR code**.
- On an Android phone: open the link, download the APK, install it (allow "install from this
  source" if prompted). Open Bout and run the full loop.

✅ Done when you can play a bout on the installed app.

---

## STAGE 7 — iOS build → TestFlight ⏱ ~30 min  (needs Apple Developer account)
```bash
eas build --profile production --platform ios
```
- Sign in with your **Apple Developer** account when prompted; let EAS create the certificates
  and provisioning profile (say yes to the prompts). It registers the `com.bout.app` bundle id.
- When the build finishes, send it to TestFlight:
```bash
eas submit --platform ios --latest
```
- **(browser)** In App Store Connect → your app → **TestFlight**, add yourself as a tester and
  install via the **TestFlight** app on your iPhone.

> Free alternative to test on the iOS **Simulator** (no paid account, but push won't work there):
> `npx expo install expo-dev-client` then `eas build --profile development --platform ios`,
> and drag the result onto the Simulator.

---

## STAGE 8 — Turn on push notifications ⏱ ~30 min
Push needs per-platform credentials. Do this once you have the dev/TestFlight builds.

**iOS (APNs):** EAS can manage it for you:
```bash
eas credentials
```
Pick **iOS → Push Notifications** and let EAS create the APNs key. (Needs the Apple account.)

**Android (FCM):**
1. **(browser)** Create a Firebase project (free) at https://console.firebase.google.com, add an
   Android app with package `com.bout.app`, download `google-services.json`.
2. Put that file in the project root and reference it — tell me and I'll wire `app.json`
   (`android.googleServicesFile`) for you, or follow https://docs.expo.dev/push-notifications/fcm-credentials/.
3. Re-run the Android build (Stage 6) so the credential is included.

Then in the app: Settings → turn on the daily drop, and approve the OS permission. Your token
saves to Supabase automatically.

---

## STAGE 9 — Paid season pass (optional) ⏱ ~45 min
Skip for a free launch. When ready:
1. **(browser)** RevenueCat → new project → add your App Store + Play products and an entitlement
   named `season_pass`.
2. Put the iOS/Android **public** API keys into `app.json` `extra.revenueCatApiKeyIos` /
   `...Android` (tell me and I'll wire them).
3. Point RevenueCat's **webhook** at `https://fklltgfczcxegijwdeax.supabase.co/functions/v1/revenuecat-webhook`
   with a header `Authorization: <random secret>`, then:
   ```bash
   npx supabase secrets set REVENUECAT_WEBHOOK_AUTH="<the same random secret>"
   ```

---

## STAGE 10 — Store listings & go live ⏱ ~2–3 hrs **(mostly browser)**
1. **Host** your Privacy Policy + Terms (drafts in `legal/`). If the URLs differ from
   `bout.app/privacy` and `bout.app/terms`, tell me and I'll update the in-app links.
2. **App Store Connect** (apple) and **Google Play Console** (google): create the app records
   using the copy in `store/metadata.md`.
3. **Screenshots:** capture from your device/Simulator at the required sizes
   (`assets/screenshots/` shows each screen as a guide).
4. **Privacy forms:** App Privacy (Apple) + Data safety (Google). We collect: handle, gameplay
   results, push token, timezone. No ads, no tracking. (See `legal/privacy-policy.md`.)
5. **Build + submit production:**
   ```bash
   eas build --profile production --platform android
   eas submit --platform android --latest
   eas build --profile production --platform ios
   eas submit --platform ios --latest
   ```
6. Submit for review in each console. (Account deletion is already in Settings — that's the
   thing reviewers check most.)

---

## STAGE 11 — Merge the code **(browser)**
Open PR #1 on GitHub → **Ready for review** → **Merge**.

---

## Cheat sheet
| Goal | Command |
|---|---|
| Free Android test app | `eas build --profile preview --platform android` |
| iOS to TestFlight | `eas build --profile production --platform ios` then `eas submit --platform ios --latest` |
| Manage push certs | `eas credentials` |
| Production + submit | `eas build --profile production --platform <p>` then `eas submit --platform <p> --latest` |

## If a build fails
Paste me the build URL or the error — most failures are a credential prompt answered "no" or a
missing account, both easy to fix.
