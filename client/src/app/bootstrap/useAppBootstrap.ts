/**
 * App Bootstrap Hook
 *
 * Bridges the bootstrap service to React component state.
 */

import { useState, useEffect } from 'react';

import { appBootstrapService } from './AppBootstrapService';

import type { AppBootstrapState, UseAppBootstrapResult } from './types';

export function useAppBootstrap(): UseAppBootstrapResult {
  const [bootstrapState, setBootstrapState] = useState<AppBootstrapState>(
    appBootstrapService.getState()
  );

  useEffect(() => {
    return appBootstrapService.subscribe(setBootstrapState);
  }, []);

  useEffect(() => {
    if (bootstrapState.currentStep === 'initialization' && bootstrapState.isLoading) {
      void appBootstrapService.bootstrap();
    }
  }, [bootstrapState.currentStep, bootstrapState.isLoading]);

  const getOverallState = (): 'initializing' | 'loading' | 'error' | 'complete' => {
    if (bootstrapState.currentStep === 'error') return 'error';
    if (bootstrapState.currentStep === 'complete') return 'complete';
    if (bootstrapState.isLoading) return 'loading';
    return 'initializing';
  };

  return {
    isReady: !bootstrapState.isLoading && bootstrapState.currentStep === 'complete',
    isLoading: bootstrapState.isLoading,
    isError: bootstrapState.currentStep === 'error',
    error: bootstrapState.error,
    state: getOverallState(),
    canRetry: bootstrapState.currentStep === 'error',
    retry: () => appBootstrapService.retry(),
    flags: bootstrapState.flags,
  };
}
