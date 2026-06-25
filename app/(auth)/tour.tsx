import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Spacer } from '@/components/atoms';
import { IconBolt, IconToday, IconLadder, IconCrew, IconSeason } from '@/components/icons';
import { usePrefs } from '@/lib/prefs';
import { playCue } from '@/lib/sound';
import { colors, spacing, radius } from '@/design/tokens';

/**
 * First-run "how it works" tour. Five tight slides that make the game obvious before the
 * user commits — so nobody bounces out confused. Shown once (tracked in prefs); replayable
 * from Settings via ?replay=1.
 */
interface Slide {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}

const ICON = 64;
const SLIDES: Slide[] = [
  {
    icon: <IconBolt size={ICON} color={colors.accent} strokeWidth={1.6} />,
    eyebrow: 'THE DAILY BOUT',
    title: 'One puzzle a day',
    body: "Everyone in your crew gets the same single puzzle each day. Solve it whenever suits — one to three minutes. That's it. No grinding, no endless rounds.",
  },
  {
    icon: <IconToday size={ICON} color={colors.text} strokeWidth={1.6} />,
    eyebrow: 'ROTATING TYPES',
    title: 'A different game daily',
    body: 'Word, logic, numbers, visual, memory, trivia, and a harder weekend feature. The type rotates, so different brains win on different days.',
  },
  {
    icon: <IconLadder size={ICON} color={colors.text} strokeWidth={1.6} />,
    eyebrow: 'THE LADDER',
    title: 'Climb your crew ladder',
    body: 'Your score feeds a season-long ladder with weight-class divisions and a finals week where scores double. This is the heart of it — bragging rights on the line.',
  },
  {
    icon: <IconSeason size={ICON} color={colors.accent} strokeWidth={1.6} />,
    eyebrow: 'STREAKS & SCORING',
    title: 'Play daily, score higher',
    body: 'A consecutive-day streak builds a score multiplier. Accuracy matters most — speed is only a small tiebreaker, so the fastest player can never just dominate.',
  },
  {
    icon: <IconCrew size={ICON} color={colors.text} strokeWidth={1.6} />,
    eyebrow: 'BRING YOUR CREW',
    title: "Better with mates",
    body: "Share an invite to start a private gym, predict who'll top the crew each day for bonus points, or get matched into a house league of similar players. Time to step in.",
  },
];

export default function Tour() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { setHasSeenTour } = usePrefs();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
      playCue('tap');
    }
  };

  const finish = () => {
    setHasSeenTour(true);
    if (replay === '1' && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const next = () => {
    if (isLast) finish();
    else scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Skip */}
      <View style={styles.topBar}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text variant="body" color={colors.textTertiary}>
            {isLast ? '' : 'Skip'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.flex}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}>{s.icon}</View>
            <Spacer size={spacing.xxl} />
            <Text variant="label" color={colors.accent}>
              {s.eyebrow}
            </Text>
            <Spacer size={spacing.md} />
            <Text variant="title" center>
              {s.title}
            </Text>
            <Spacer size={spacing.md} />
            <Text variant="body" color={colors.textSecondary} center style={styles.body}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots + action */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
          ))}
        </View>
        <Spacer size={spacing.lg} />
        <Button label={isLast ? "Let's go" : 'Next'} onPress={next} cue={isLast ? 'submit' : 'tap'} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topBar: { height: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: spacing.xl },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { maxWidth: 320, lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { backgroundColor: colors.accent, width: 22 },
});
