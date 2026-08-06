import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Spacer, Eyebrow, Loading } from '@/components/atoms';
import { getPackages, purchase, restorePurchases, isMonetizationConfigured, type PurchasesPackage } from '@/lib/monetization';
import { setProfileEntitlements } from '@/lib/api';
import { useBootstrapState } from '@/providers/Bootstrap';
import { colors, spacing, radius } from '@/design/tokens';

const PERKS = [
  'Deeper stats — accuracy, completion rate, best scores',
  'Advanced puzzles and the harder weekend feature',
  'Larger custom crews and create-your-own bouts',
  'Crew cosmetics and customisation',
];

function periodLabel(pkg: PurchasesPackage): string {
  const t = pkg.packageType;
  if (t === 'ANNUAL') return 'Annual';
  if (t === 'MONTHLY') return 'Monthly';
  if (t === 'WEEKLY') return 'Weekly';
  if (t === 'LIFETIME') return 'Lifetime';
  return pkg.product.title || 'Season Pass';
}

export default function Paywall() {
  const router = useRouter();
  const { refresh } = useBootstrapState();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPackages().then((p) => {
      setPackages(p);
      // Default-select the annual (best value) if present, else the first.
      const annual = p.find((x) => x.packageType === 'ANNUAL');
      setSelected((annual ?? p[0])?.identifier ?? null);
    });
  }, []);

  const buy = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg) return;
    setBusy(true);
    const res = await purchase(pkg);
    if (res.success) {
      await setProfileEntitlements(res.entitlements);
      await refresh();
      setBusy(false);
      router.back();
    } else {
      setBusy(false);
      Alert.alert('Not completed', 'Your purchase was cancelled or could not be processed.');
    }
  };

  const restore = async () => {
    setBusy(true);
    const ents = await restorePurchases();
    if (ents.length) {
      await setProfileEntitlements(ents);
      await refresh();
      setBusy(false);
      router.back();
    } else {
      setBusy(false);
      Alert.alert('Nothing to restore', 'No active subscription was found for this account.');
    }
  };

  return (
    <Screen scroll footer={
      packages && packages.length > 0 ? (
        <Button label={busy ? 'Processing…' : 'Subscribe'} loading={busy} onPress={buy} cue="submit" />
      ) : undefined
    }>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={colors.textTertiary}>
            Close
          </Text>
        </Pressable>
        <Eyebrow color={colors.accent}>SEASON PASS</Eyebrow>
      </View>

      <Spacer size={spacing.xl} />
      <Text variant="title">Go deeper</Text>
      <Spacer size={spacing.sm} />
      <Text variant="body" color={colors.textSecondary}>
        The daily bout and the ladder are always free. The pass adds depth — never an unfair edge.
      </Text>

      <Spacer size={spacing.lg} />
      {PERKS.map((p) => (
        <View key={p} style={styles.perk}>
          <Text variant="bodyStrong" color={colors.accent}>
            ✓
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
            {p}
          </Text>
        </View>
      ))}

      <Spacer size={spacing.xl} />

      {packages === null ? (
        <Loading label="Loading plans" />
      ) : packages.length === 0 ? (
        <View style={styles.note}>
          <Text variant="bodyStrong">Not available yet</Text>
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6 }}>
            {isMonetizationConfigured()
              ? 'Subscription plans are still being set up. Check back soon.'
              : 'The store is not configured in this build — the app is fully free.'}
          </Text>
        </View>
      ) : (
        packages.map((pkg) => {
          const on = selected === pkg.identifier;
          const isAnnual = pkg.packageType === 'ANNUAL';
          return (
            <Pressable key={pkg.identifier} onPress={() => setSelected(pkg.identifier)} style={[styles.plan, on && styles.planOn]}>
              <View style={{ flex: 1 }}>
                <View style={styles.planTop}>
                  <Text variant="bodyStrong">{periodLabel(pkg)}</Text>
                  {isAnnual ? (
                    <View style={styles.badge}>
                      <Text variant="label" color={colors.textInverse}>
                        BEST VALUE
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="caption" color={colors.textTertiary}>
                  {pkg.product.description || 'Renews automatically. Cancel anytime.'}
                </Text>
              </View>
              <Text variant="data" mono color={on ? colors.accent : colors.text}>
                {pkg.product.priceString}
              </Text>
            </Pressable>
          );
        })
      )}

      <Spacer size={spacing.lg} />
      <Button label="Restore purchases" variant="ghost" onPress={restore} />
      <Spacer size={spacing.sm} />
      <Text variant="caption" color={colors.textTertiary} center>
        Payment is charged to your store account at confirmation of purchase. Subscriptions renew
        automatically unless cancelled at least 24 hours before the end of the current period, and
        your account is charged for renewal within 24 hours of that point. Manage or cancel anytime
        in your App Store / Play account settings.
      </Text>

      {/* App Store Guideline 3.1.2 requires functional Terms and Privacy links on the
          purchase screen itself, not only in Settings. */}
      <Spacer size={spacing.md} />
      <View style={styles.legal}>
        <Pressable onPress={() => router.push('/legal/terms')} hitSlop={8}>
          <Text variant="caption" color={colors.textSecondary}>
            Terms of Use
          </Text>
        </Pressable>
        <Text variant="caption" color={colors.textTertiary}>
          ·
        </Text>
        <Pressable onPress={() => router.push('/legal/privacy')} hitSlop={8}>
          <Text variant="caption" color={colors.textSecondary}>
            Privacy Policy
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  perk: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: 6 },
  note: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  planOn: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surfaceRaised },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
