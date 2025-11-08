/**
 * App Bootstrap Hook
 *
 * React hook for managing application initialization state.
 * Provides clean integration between bootstrap service and React components.
 */

import { useState, useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { appBootstrapService } from './AppBootstrapService';

import type { 
  AppBootstrapState,
  BootstrapStep,
  UseAppBootstrapResult,
  BootstrapInitializationResult,
  BootstrapError
} from './types';

// UseAppBootstrapResult is now defined in types.ts for centralized type management

/**
 * Main bootstrap hook for application initialization
 */
export function useAppBootstrap(): UseAppBootstrapResult {
  const queryClient = useQueryClient();
  const [bootstrapState, setBootstrapState] = useState<AppBootstrapState>(
    appBootstrapService.getState()
  );

  useEffect(() => {
    // Subscribe to bootstrap state changes
    const unsubscribe = appBootstrapService.subscribe(setBootstrapState);
    
    // Start bootstrap process if not already started
    if (bootstrapState.currentStep === 'initialization' && bootstrapState.isLoading) {
      appBootstrapService.bootstrap(queryClient);
    }

    return unsubscribe;
  }, [queryClient, bootstrapState.currentStep, bootstrapState.isLoading]);

  // Generate context message for loading screen
  const getContextMessage = (step: BootstrapStep): string => {
    switch (step) {
      case 'initialization':
        return 'Initializing application...';
      case 'auth-check':
        return 'Checking authentication...';
      case 'socket-connection':
        return 'Establishing real-time connection...';
      case 'data-loading':
        return 'Loading workspace data...';
      case 'complete':
        return 'Ready!';
      case 'error':
        return bootstrapState.error || 'Initialization failed';
      default:
        return 'Starting up...';
    }
  };

  // Calculate progress based on completed steps
  const stepOrder: BootstrapStep[] = ['initialization', 'auth-check', 'socket-connection', 'data-loading', 'complete'];
  const currentStepIndex = stepOrder.indexOf(bootstrapState.currentStep);
  const progress = currentStepIndex >= 0 ? Math.round((currentStepIndex / (stepOrder.length - 1)) * 100) : 0;
  
  // Get completed steps
  const completedSteps = bootstrapState.steps
    .filter(step => step.completed)
    .map(step => step.step);

  // Determine overall state
  const getOverallState = (): 'initializing' | 'loading' | 'error' | 'retrying' | 'complete' => {
    if (bootstrapState.currentStep === 'error') return 'error';
    if (bootstrapState.currentStep === 'complete') return 'complete';
    if (bootstrapState.isLoading) return 'loading';
    return 'initializing';
  };

  // Create initialization result for detailed error handling
  const initializationResult: BootstrapInitializationResult | null = {
    completedSteps,
    errors: bootstrapState.steps
      .filter(step => step.error)
      .map(step => ({
        message: step.error!,
        step: step.step,
        code: 'BOOTSTRAP_ERROR',
        retryable: true
      })) as BootstrapError[],
    isComplete: bootstrapState.currentStep === 'complete',
    timestamp: new Date()
  };

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
    flags: bootstrapState.flags
  };
}

/**
 * Simplified hook for components that just need to know if app is ready
 * ARCHITECTURAL IMPROVEMENT: Lightweight alternative for simple use cases
 */
export function useAppReady(): boolean {
  const { isReady } = useAppBootstrap();
  return isReady;
}
