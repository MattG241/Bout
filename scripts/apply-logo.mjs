/**
 * Apply your brand logo everywhere from a single source file.
 *
 * 1. Save your logo as assets/icon.png (a 1024x1024 PNG, ideally black to the edges since iOS
 *    rounds the corners itself).
 * 2. Run:  node scripts/apply-logo.mjs
 *
 * This copies it to the other icon slots Expo uses (adaptive icon, splash, web favicon) so the
 * app icon, splash screen, and in-app logo all match. Expo resizes them for each platform at
 * build time, so one good 1024x1024 source is all you need.
 *
 * (The Android notification icon is intentionally left alone — it must be a white silhouette on
 *  transparent, not a full-colour logo.)
 */
import { copyFileSync, existsSync } from 'node:fs';

const SRC = 'assets/icon.png';
const TARGETS = ['assets/adaptive-icon.png', 'assets/splash.png', 'assets/favicon.png'];

if (!existsSync(SRC)) {
  console.error(`✗ ${SRC} not found. Save your logo there first (1024x1024 PNG), then re-run.`);
  process.exit(1);
}

for (const t of TARGETS) {
  copyFileSync(SRC, t);
  console.log(`✓ ${t}`);
}
console.log('\nDone. Your logo is now the app icon, splash, favicon, and in-app logo.');
console.log('Restart with:  npx expo start --clear');
