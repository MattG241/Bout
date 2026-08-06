import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile, getMyLeagues, syncTimezone } from '@/lib/api';
import { initPurchases, logoutPurchases } from '@/lib/monetization';
import { useStore } from '@/store/useStore';

export type BootstrapState = 'loading' | 'signed-out' | 'needs-handle' | 'needs-league' | 'ready';

/**
 * App bootstrap: subscribes to auth, hydrates profile + leagues, and derives where the
 * user should land (auth → handle → league → app). Keeps the navigation gates in one place.
 */
export function useBootstrap(): { state: BootstrapState; refresh: () => Promise<void> } {
  const [state, setState] = useState<BootstrapState>('loading');
  const { setUserId, setProfile, setLeagues } = useStore();

  const hydrate = async (userId: string | null) => {
    setUserId(userId);
    if (!userId) {
      setProfile(null);
      setLeagues([]);
      logoutPurchases().catch(() => {});
      setState('signed-out');
      return;
    }
    // Bind in-app purchases to this account (no-op until RevenueCat keys are set).
    initPurchases(userId).catch(() => {});
    const profile = await getProfile(userId);
    setProfile(profile);
    if (!profile) {
      setState('needs-handle');
      return;
    }
    // Keep the stored timezone current so the morning push stays in local time.
    syncTimezone().catch(() => {});
    const leagues = await getMyLeagues();
    setLeagues(leagues);
    setState(leagues.length === 0 ? 'needs-league' : 'ready');
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    await hydrate(data.user?.id ?? null);
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) hydrate(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { state, refresh };
}
