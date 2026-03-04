/**
 * App Bootstrap Hook
 *
 * Bridges the bootstrap service to React component state.
 */

import { useState, useEffect, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { appBootstrapService } from './AppBootstrapService';
import { LOADING_MESSAGES } from './constants';

import type {
  AppBootstrapState,
  BootstrapStep,
  UseAppBootstrapResult,
  BootstrapInitializationResult,
  BootstrapError,
} from './types';

const STEP_ORDER: BootstrapStep[] = [
  'initialization',
  'auth-check',
  'socket-connection',
  'data-loading',
  'complete',
];

export function useAppBootstrap(): UseAppBootstrapResult {
  const queryClient = useQueryClient();
  const [bootstrapState, setBootstrapState] = useState<AppBootstrapState>(
    appBootstrapService.getState()
  );

  useEffect(() => {
    return appBootstrapService.subscribe(setBootstrapState);
  }, []);

  useEffect(() => {
    if (bootstrapState.currentStep === 'initialization' && bootstrapState.isLoading) {
      void appBootstrapService.bootstrap(queryClient);
    }
  }, [queryClient, bootstrapState.currentStep, bootstrapState.isLoading]);

  const getContextMessage = (step: BootstrapStep): string => {
    if (step === 'error') return bootstrapState.error ?? 'Initialization failed';
    return LOADING_MESSAGES[step] ?? 'Starting up...';
  };

  const currentStepIndex = STEP_ORDER.indexOf(bootstrapState.currentStep);
  const progress =
    currentStepIndex >= 0 ? Math.round((currentStepIndex / (STEP_ORDER.length - 1)) * 100) : 0;

  const completedSteps = bootstrapState.steps.filter(step => step.completed).map(step => step.step);

  const getOverallState = (): 'initializing' | 'loading' | 'error' | 'complete' => {
    if (bootstrapState.currentStep === 'error') return 'error';
    if (bootstrapState.currentStep === 'complete') return 'complete';
    if (bootstrapState.isLoading) return 'loading';
    return 'initializing';
  };

  const initializationResult: BootstrapInitializationResult = useMemo(
    () => ({
      completedSteps,
      errors: bootstrapState.steps
        .filter(step => step.error)
        .map(step => ({
          message: step.error!,
          step: step.step,
          retryable: true,
        })) as BootstrapError[],
      isComplete: bootstrapState.currentStep === 'complete',
      timestamp: new Date(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bootstrapState.steps, bootstrapState.currentStep]
  );

  return {
    isReady: !bootstrapState.isLoading && bootstrapState.currentStep === 'complete',
    isLoading: bootstrapState.isLoading,
    isError: bootstrapState.currentStep === 'error',
    error: bootstrapState.error,
    currentStep: bootstrapState.currentStep,
    context: getContextMessage(bootstrapState.currentStep),
    state: getOverallState(),
    progress,
    canRetry: bootstrapState.currentStep === 'error',
    completedSteps,
    initializationResult,
    retry: () => appBootstrapService.retry(queryClient),
    flags: bootstrapState.flags,
  };
}
