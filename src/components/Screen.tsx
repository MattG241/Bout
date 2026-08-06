import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, RefreshControl } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, layout } from '@/design/tokens';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** Pull-to-refresh handler; enables a refresh control when scroll is on. */
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** Sticky footer (e.g. a primary action) pinned to the safe-area bottom. */
  footer?: React.ReactNode;
}

/**
 * The base screen wrapper: near-black background, safe-area aware (handles notches and
 * Android system bars), generous padding, optional scroll + pull-to-refresh + sticky footer.
 */
export function Screen({
  children,
  scroll = false,
  onRefresh,
  refreshing = false,
  edges = ['top', 'left', 'right'],
  contentStyle,
  footer,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.screenPadding,
    paddingBottom: layout.screenPadding,
    flexGrow: 1,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.screenPadding,
    paddingTop: 8,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
