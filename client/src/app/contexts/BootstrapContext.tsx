/**
 * Bootstrap Context
 *
 * Only App.tsx calls useAppBootstrap hook, all other components consume via context.
 * Prevents duplicate bootstrap processes.
 */
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { UseAppBootstrapResult } from '@app/bootstrap';

type BootstrapContextValue = UseAppBootstrapResult;

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

interface BootstrapProviderProps {
  value: UseAppBootstrapResult;
  children: ReactNode;
}

/**
 * Provider component - used only in App.tsx
 */
export function BootstrapProvider({ value, children }: BootstrapProviderProps) {
  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

/**
 * Consumer hook - replaces direct useAppBootstrap() calls
 */
export function useBootstrapContext(): UseAppBootstrapResult {
  const context = useContext(BootstrapContext);

  if (!context) {
    throw new Error(
      'useBootstrapContext must be used within a BootstrapProvider. ' +
        'This hook should replace direct useAppBootstrap() calls to prevent duplicate bootstrap processes.'
    );
  }

  return context;
}
