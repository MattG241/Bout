import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors, spacing } from '@/design/tokens';
import { IconToday, IconLadder, IconSeason, IconCrew, IconSettings } from '@/components/icons';

/**
 * The five home tabs. Minimal chrome: a hairline-topped near-black bar, thin line icons,
 * the accent reserved for the active tab.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: spacing.sm,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <IconToday color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="ladder"
        options={{ title: 'Ladder', tabBarIcon: ({ color }) => <IconLadder color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="season"
        options={{ title: 'Season', tabBarIcon: ({ color }) => <IconSeason color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="crew"
        options={{ title: 'Crew', tabBarIcon: ({ color }) => <IconCrew color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <IconSettings color={color} size={22} /> }}
      />
    </Tabs>
  );
}
