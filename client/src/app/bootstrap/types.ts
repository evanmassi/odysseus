/**
 * Application bootstrap types
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

export interface BootstrapError {
  message: string;
  step: BootstrapStep;
  code: string;
  retryable: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic error details with varying structure
  details?: Record<string, any>;
}

export interface BootstrapInitializationResult {
  completedSteps: BootstrapStep[];
  errors: BootstrapError[];
  isComplete: boolean;
  timestamp: Date;
}

export interface UseAppBootstrapResult {
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  error: string | BootstrapError | null;
  currentStep: BootstrapStep;
  context: string;
  state: 'initializing' | 'loading' | 'error' | 'retrying' | 'complete';
  progress: number;
  canRetry: boolean;
  completedSteps: BootstrapStep[];
  initializationResult: BootstrapInitializationResult | null;
  retry: () => void;
  flags: {
    firstTimeSetupRequired: boolean;
    needsSystemAdmin: boolean;
  };
}
