/**
 * BOUT design tokens — radical restraint. Near-black surfaces, high-contrast white text,
 * one rationed accent, flat fills, tabular figures for all data. No gradients, no glass,
 * no pastels, no emoji. Confidence from type and negative space.
 */

export const colors = {
  // True near-black surfaces (rule: black, not charcoal/navy).
  bg: '#000000',
  surface: '#0A0A0A',
  surfaceRaised: '#141414',
  // Hairlines and dividers — barely there.
  border: '#1F1F1F',
  borderStrong: '#2A2A2A',

  // Text — white and off-white, high contrast.
  text: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textTertiary: '#6B6B6B',
  textInverse: '#000000',

  // The single rationed accent — a clean electric green, used ONLY for the live state
  // and the one primary action on a screen.
  accent: '#00E676',
  accentMuted: '#0E3A22',

  // Functional, used sparingly.
  danger: '#FF4D4D',
  win: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  // BeReal-style 12–20px on cards/surfaces. Not pill-shaped everything.
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999, // reserved for genuinely pill elements (toggles), used rarely
} as const;

/**
 * Type scale. We rely on the platform's clean neutral sans (San Francisco on iOS,
 * Roboto on Android) — confident and simple, with a system monospace for all data
 * so scores and ladders align like a results sheet (tabular figures).
 */
export const fonts = {
  sans: undefined as undefined | string, // system sans (SF / Roboto)
  // System monospace gives reliable tabular figures across both platforms.
  mono: 'monospace',
} as const;

export const type = {
  // Display — for the big moments (your score, the day's result, the ladder leader).
  display: { fontSize: 56, lineHeight: 58, fontWeight: '800' as const, letterSpacing: -1.5 },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 22, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500' as const, letterSpacing: 0.2 },
  // Label — uppercase eyebrow text, tracked out.
  label: { fontSize: 12, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.4 },
  // Data — tabular figures for scores/times/standings.
  dataLarge: { fontSize: 40, lineHeight: 44, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
  data: { fontSize: 18, lineHeight: 22, fontWeight: '600' as const, fontVariant: ['tabular-nums'] as const },
} as const;

export const motion = {
  // Minimal, smooth, purposeful. Nothing bouncy.
  fast: 150,
  base: 220,
  slow: 320,
} as const;

export const layout = {
  screenPadding: spacing.xl,
  maxContentWidth: 520,
} as const;

export const theme = { colors, spacing, radius, type, fonts, motion, layout } as const;
export type Theme = typeof theme;
