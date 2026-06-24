/**
 * Application Bootstrap Types
 *
 * State shape and contracts for the multi-step initialization sequence.
 */

export interface AppBootstrapState {
  isLoading: boolean;
  currentStep: BootstrapStep;
  error: string | null;
  steps: BootstrapStepInfo[];
  flags: {
    firstTimeSetupRequired: boolean;
    needsSystemAdmin: boolean;
  };
}

export type BootstrapStep =
  | 'initialization'
  | 'auth-check'
  | 'session-restore'
  | 'cache-validation'
  | 'socket-connection'
  | 'data-loading'
  | 'complete'
  | 'error';

export interface BootstrapStepInfo {
  step: BootstrapStep;
  label: string;
  completed: boolean;
  error?: string;
}

export interface UseAppBootstrapResult {
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  state: 'initializing' | 'loading' | 'error' | 'complete';
  canRetry: boolean;
  retry: () => void;
  flags: {
    firstTimeSetupRequired: boolean;
    needsSystemAdmin: boolean;
  };
}
