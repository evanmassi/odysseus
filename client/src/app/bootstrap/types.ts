/**
 * Application Bootstrap Types
 *
 * State shape and contracts for the multi-step initialization sequence.
 */

export interface AppBootstrapState {
  isLoading: boolean;
  currentStep: BootstrapStep;
  error: string | null;
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

export interface UseAppBootstrapResult {
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  state: 'loading' | 'error' | 'complete';
  canRetry: boolean;
  retry: () => void;
}
