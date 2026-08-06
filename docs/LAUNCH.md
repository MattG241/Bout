# Bout — Launch Runbook

Follow these phases in order. Each one builds on the last. Commands are copy-paste; anything
marked **(dashboard)** is done in a web browser, not the terminal.

> Symbols: 💻 = run in terminal · 🌐 = do in a website · ⏱ = rough time

---

## What you'll need to sign up for (once)
- **Supabase** account — free tier is fine to start. https://supabase.com
- **Expo / EAS** account — free. https://expo.dev
- **Apple Developer Program** — $99/year (required to ship to iOS). https://developer.apple.com/programs
- **Google Play Developer** — $25 one-time. https://play.google.com/console
- **RevenueCat** — free tier, only if you want the paid season pass. https://revenuecat.com

---

## Phase 0 — Get the code on your computer ⏱ 10 min
1. 💻 Install the basics if you don't have them: [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com).
2. 💻 Clone the repo and switch to this branch:
   ```bash
   git clone https://github.com/MattG241/Bout.git
   cd Bout
   git checkout claude/brave-carson-jjy7xp
   npm install
   ```
3. 💻 Sanity check it's healthy:
   ```bash
   npm test && npm run typecheck
   ```
   You should see all tests pass.

---

## Phase 1 — See it running on your phone TODAY ⏱ 15 min
This gives you an instant look at the UI (some features need the backend from Phase 2).
1. 🌐 Install **Expo Go** from the App Store / Play Store on your phone.
2. 💻 Start the app:
   ```bash
   npx expo start
   ```
3. 📱 Scan the QR code with your phone (Camera app on iOS, Expo Go on Android).
4. The app boots to the welcome screen. You can click around the design.
   *(Sign-in, puzzles, and the ladder won't work yet — that's Phase 2.)*

---

## Phase 2 — Turn on the backend (Supabase) ⏱ 45 min
This is the big one. It makes the app actually function.

1. 🌐 Go to https://supabase.com → **New project**. Pick a name, a strong database password,
   and a region near your players. Wait for it to finish provisioning.
2. 🌐 In the project, open **Settings → API**. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string)
   *(Both are safe to put in the app — they're public client keys. Do NOT copy the `service_role` key into the app.)*
3. 💻 Install the Supabase CLI and log in:
   ```bash
   npm install -g supabase
   supabase login
   ```
4. 💻 Link this repo to your project (the ref is in your project URL, e.g. `abcd1234`):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
5. ✏️ **One edit before deploying the schedule:** open `supabase/migrations/0004_cron.sql`
   and replace every `<PROJECT_REF>` with your project ref.
6. 💻 Apply the database (tables, security rules, functions, schedules):
   ```bash
   supabase db push
   ```
7. 💻 Deploy the server functions:
   ```bash
   npm run build:edge-core
   supabase functions deploy
   ```
8. 🌐 **Enable guest sign-in:** Authentication → **Providers** → turn on **Anonymous**.
   (Optional: under Providers → Email, turn off "Confirm email" so email sign-up is instant.)
9. 🌐 **(Only if using cron) Store the service key for scheduled jobs:** Settings → API, copy the
   `service_role` key. Then go to **Database → Vault → New secret**, name it exactly
   `service_role_key`, paste the key.

✅ Backend is live.

---

## Phase 3 — Point the app at your backend + seed the first puzzle ⏱ 15 min
1. ✏️ Open `app.json`. In the `"extra"` block, replace the placeholders with your two values
   from Phase 2, step 2:
   ```json
   "extra": {
     "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
     "supabaseAnonKey": "YOUR_ANON_KEY",
     ...
   }
   ```
2. 💻 Create today's puzzle now (otherwise you wait for the morning cron). In your Supabase
   project: **Edge Functions → publish-daily-puzzle → Invoke** (🌐), or run:
   ```bash
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/publish-daily-puzzle" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
3. 💻 Restart the app: `npx expo start --clear`, reopen on your phone.
4. 📱 **Test the full loop:** Get started → pick a handle → "Match me into a house league" →
   solve today's bout → see your score and the ladder update.

✅ If that works end-to-end, the product is real.

---

## Phase 4 — Notifications & paid pass (optional, do later) ⏱ varies
These need a **development build** (Phase 5), not Expo Go.
- **Push:** follow Expo's guide to add your **APNs key** (iOS) and **FCM** (Android) in your
  Expo project. https://docs.expo.dev/push-notifications/push-notifications-setup/
- **Season pass:** create a RevenueCat project, add your products, set the iOS/Android API keys
  in `app.json` `extra`, and set the webhook to your `revenuecat-webhook` function URL with a
  shared secret (also set `REVENUECAT_WEBHOOK_AUTH` via `supabase secrets set`).
  *(Skip entirely if you're launching free first — the app works fully without it.)*

---

## Phase 5 — Build real apps you can install ⏱ 1–2 hrs (mostly waiting on builds)
1. 💻 Install EAS and log in:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```
   *(This writes your EAS `projectId` into the app — needed for push.)*
2. 🌐 Make sure your **Apple Developer** and **Google Play** accounts are active.
3. 💻 Build a testable Android app (fastest):
   ```bash
   eas build --platform android --profile preview
   ```
   When it finishes, install the APK on an Android phone from the link EAS gives you.
4. 💻 Build for iOS (EAS walks you through Apple sign-in + signing):
   ```bash
   eas build --platform ios --profile production
   ```
5. 📱 **Test on real devices**: the full flow, push notification, sharing a result card, and the
   live race with a second device.

---

## Phase 6 — Store listings & submit ⏱ 2–3 hrs
1. 🌐 **Host two web pages** (any host): your Privacy Policy and Terms. Use the drafts in
   `legal/` (have a lawyer skim them). Put them at `bout.app/privacy` and `bout.app/terms`
   (or update those URLs in `app/(tabs)/settings.tsx`).
2. 🌐 Create the app in **App Store Connect** and **Google Play Console** using the copy in
   `store/metadata.md`.
3. 📱 Capture **device screenshots** at the sizes each store asks for (the images in
   `assets/screenshots/` show what each screen looks like as a reference).
4. 🌐 Fill in **App Privacy** (Apple) and **Data safety** (Google) forms — we collect handle,
   gameplay data, push token, timezone; no ads/tracking; see `legal/privacy-policy.md`.
5. 💻 Submit:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```
6. 🌐 Answer any reviewer questions. (Account deletion is already built in Settings — that's the
   one reviewers most often ask for.)

---

## Phase 7 — Merge the code ⏱ 5 min
Once you're happy, 🌐 open the PR (#1) on GitHub and click **Ready for review → Merge**.

---

## Quick reference: what works without each piece
| If you skip… | The app… |
|---|---|
| Supabase (Phase 2) | shows the UI but can't sign in, play, or rank |
| Push (Phase 4) | works fully, just no daily reminder |
| RevenueCat (Phase 4) | works fully and free; the season pass button is inert |
| EAS build (Phase 5) | runs in Expo Go for testing but can't go to the stores |

## The single most important test
After Phase 3, confirm one real person can: **sign in → solve the bout → see their score on the
ladder**. If that works, everything downstream is configuration, not code.
