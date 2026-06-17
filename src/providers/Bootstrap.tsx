import React, { createContext, useContext } from 'react';
import { useBootstrap, type BootstrapState } from '@/hooks/useBootstrap';

interface BootstrapContextValue {
  state: BootstrapState;
  refresh: () => Promise<void>;
}

const BootstrapContext = createContext<BootstrapContextValue>({
  state: 'loading',
  refresh: async () => {},
});

/** Runs the single app-wide bootstrap (auth listener + hydration) and shares its state. */
export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const value = useBootstrap();
  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrapState(): BootstrapContextValue {
  return useContext(BootstrapContext);
}
