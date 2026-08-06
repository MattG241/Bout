# Bout — Mac Quickstart (copy-paste)

Built for macOS. Run each block in **Terminal** (press ⌘-Space, type "Terminal", Enter).
Lines starting with `#` are comments — safe to paste. **(browser)** = do it on a website.

---

## STEP 1 — Install the tools (once) ⏱ ~15 min
Paste this whole block. If Homebrew is already installed it just skips ahead.

```bash
# Install Homebrew (Mac package manager) if you don't have it
which brew >/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Core tools
brew install node git watchman
brew install supabase/tap/supabase

# Apple command-line tools (for iOS). If it pops a dialog, click Install.
xcode-select --install 2>/dev/null; true

# Expo + EAS build tools
npm install -g eas-cli
```

---

## STEP 2 — Get the code ⏱ ~5 min
```bash
cd ~/Desktop
git clone https://github.com/MattG241/Bout.git
cd Bout
git checkout claude/brave-carson-jjy7xp
npm install
npm test          # should say all tests passed
```

> From now on, every block assumes you're inside the `Bout` folder. If a new Terminal
> opens, run `cd ~/Desktop/Bout` first.

---

## STEP 3 — See it on your phone right now ⏱ ~10 min
1. **(browser/phone)** Install **Expo Go** from the App Store on your iPhone.
2. ```bash
   npx expo start
   ```
3. Open the iPhone **Camera**, point at the QR code in Terminal, tap the banner.
   *(Prefer the simulator? Press `i` in Terminal to open the iOS Simulator instead.)*

You'll see the welcome screen and can tap around. Playing needs Step 4.

---

## STEP 4 — Turn on the backend (Supabase) ⏱ ~45 min

### 4a. Create the project **(browser)**
1. Go to https://supabase.com → sign in → **New project**.
2. Name it `bout`, set a database password (save it somewhere), pick a nearby region, create.
3. Wait until it's ready, then open **Settings → API** and keep that tab open — you need three
   values from it below.

### 4b. Save your project values as variables
Replace the three values, then paste. (URL and anon key are public/safe. The ref is the part of
your URL before `.supabase.co`.)

```bash
export SB_REF="PASTE_PROJECT_REF"          # e.g. abcd1234
export SB_URL="https://PASTE_PROJECT_REF.supabase.co"
export SB_ANON="PASTE_ANON_PUBLIC_KEY"     # long string under "Project API keys → anon public"
```

### 4c. Connect and deploy
```bash
# Log in (opens your browser to authorise)
supabase login

# Link this folder to your project (it'll ask for your DB password from 4a)
supabase link --project-ref "$SB_REF"

# Put your project ref into the scheduled-jobs file (Mac sed syntax)
sed -i '' "s/<PROJECT_REF>/$SB_REF/g" supabase/migrations/0004_cron.sql

# Create all the tables, security rules, and functions
supabase db push

# Build + deploy the server functions
npm run build:edge-core
supabase functions deploy
```

### 4d. Two clicks in the dashboard **(browser)**
1. **Authentication → Providers → Anonymous** → toggle **ON** (lets people start as a guest).
2. *(Optional, for cron reminders)* **Settings → API**, copy the **`service_role`** key →
   **Database → Vault → New secret** → name it exactly `service_role_key`, paste, save.

✅ Backend is live.

---

## STEP 5 — Connect the app + create today's puzzle ⏱ ~10 min
Paste this — it writes your keys into the app and asks the server to make today's bout:

```bash
# Write your Supabase keys into app.json automatically
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('app.json'));j.expo.extra.supabaseUrl=process.env.SB_URL;j.expo.extra.supabaseAnonKey=process.env.SB_ANON;fs.writeFileSync('app.json',JSON.stringify(j,null,2));console.log('app.json updated ✔');"

# Generate today's puzzle now (so you don't wait for the morning job)
curl -s -X POST "$SB_URL/functions/v1/publish-daily-puzzle" -H "Authorization: Bearer $SB_ANON"; echo

# Restart the app fresh
npx expo start --clear
```

Reopen it in Expo Go and run the real loop:
**Get started → choose a handle → "Match me into a house league" → solve the bout → see your score + the ladder.**

✅ If that works, your game is real. Everything after this is just packaging.

---

## STEP 6 — (Optional, later) Notifications & paid pass
Skip for a free first launch — the app works fully without these. When ready:
- **Push:** https://docs.expo.dev/push-notifications/push-notifications-setup/ (add an APNs key + FCM).
- **Season pass:** create a RevenueCat project, add products, put the iOS/Android keys into
  `app.json` `extra`, point its webhook at your `revenuecat-webhook` function, and run
  `supabase secrets set REVENUECAT_WEBHOOK_AUTH=some-long-random-string`.

---

## STEP 7 — Build installable apps (EAS) ⏱ ~1–2 hrs (mostly waiting)
```bash
eas login
eas build:configure          # sets up your Expo build project

# Android test build (fastest — gives you an installable file)
eas build --platform android --profile preview

# iOS build (signs in to your Apple Developer account and handles certificates)
eas build --platform ios --profile production
```
Install the finished builds from the links EAS prints, and test on real devices (especially
the push notification, sharing a result card, and a live race with a second phone).

> Requires an **Apple Developer** account ($99/yr) and **Google Play** account ($25 once).

---

## STEP 8 — Store listings & submit ⏱ ~2–3 hrs **(browser)**
1. Host your **Privacy Policy** and **Terms** somewhere (use the drafts in `legal/`). If you host
   them at addresses other than `bout.app/privacy` and `bout.app/terms`, update those two links
   in `app/(tabs)/settings.tsx`.
2. Create the app in **App Store Connect** and **Google Play Console** using the copy in
   `store/metadata.md`.
3. Upload screenshots at the sizes each store wants (`assets/screenshots/` shows each screen).
4. Fill **App Privacy** (Apple) and **Data safety** (Google): we collect handle, gameplay,
   push token, timezone; no ads/tracking.
5. Submit:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

---

## STEP 9 — Merge the code **(browser)**
Open Pull Request **#1** on GitHub → **Ready for review** → **Merge**.

---

## If something breaks
- `npx expo start --clear` fixes most "weird state" issues.
- "Command not found: brew/node/supabase" → re-run STEP 1.
- App opens but can't sign in → re-check STEP 5 (keys in `app.json`) and STEP 4d (Anonymous ON).
- Stuck? Send me the exact error text and which step you were on.

## The one test that proves it works
After STEP 5: one real person can **sign in → solve the bout → see their score on the ladder.**
