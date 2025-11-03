/**
 * Bootstrap Context - Single Source of Truth for Bootstrap State
 *
 * ARCHITECTURAL SOLUTION: Prevents duplicate bootstrap processes
 * Only App.tsx calls useAppBootstrap hook, all other components consume via context
 *
 * Singleton service pattern via React Context
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { UseAppBootstrapResult } from '@app/bootstrap';

interface BootstrapContextValue extends UseAppBootstrapResult {}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

interface BootstrapProviderProps {
  value: UseAppBootstrapResult;
  children: ReactNode;
}

/**
 * Provider component - used only in App.tsx
 */
export function BootstrapProvider({ value, children }: BootstrapProviderProps) {
  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
}

/**
 * Consumer hook - replaces direct useAppBootstrap() calls
 * ARCHITECTURAL IMPROVEMENT: Prevents duplicate bootstrap processes
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

/**
 * Legacy compatibility - components can still check bootstrap readiness
 * but don't trigger new bootstrap processes
 */
export function useAppReady(): boolean {
  const { isReady } = useBootstrapContext();
  return isReady;
}
