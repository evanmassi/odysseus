/**
 * App Loader Component
 *
 * Loading screen with detailed progress feedback and error recovery options.
 */

import { AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

import odysseusLogo from '@shared/assets/odysseus-logo-thick.svg';
import { env } from '@shared/config/environment';
import { Spinner } from '@shared/ui';

import { LOADING_MESSAGES } from '../../bootstrap/constants';

import { OfflineInitializationPage } from './OfflineInitializationPage';

import type { UseAppBootstrapResult } from '../../bootstrap/types';

interface AppLoaderProps {
  context: UseAppBootstrapResult;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function AppLoader({ context, onRetry, onCancel }: AppLoaderProps) {
  const { state, progress, currentStep, error, canRetry, completedSteps } = context;

  // Show dedicated offline page for network errors during initialization
  const isOfflineError = error === 'OFFLINE_DURING_INIT';
  if (isOfflineError && onRetry) {
    return <OfflineInitializationPage onRetry={onRetry} />;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            {state === 'error' ? (
              <AlertCircle className="w-14 h-14 text-danger-bg" />
            ) : state === 'retrying' ? (
              <RefreshCw className="w-14 h-14 text-warning-bg animate-spin" />
            ) : (
              <Spinner size="xl" />
            )}
          </div>

          <img src={odysseusLogo} alt="Odysseus" className="h-10 w-auto mx-auto mb-2" />

          <p className="text-muted-foreground">
            {state === 'error'
              ? 'Initialization Failed'
              : state === 'retrying'
                ? 'Retrying Connection...'
                : 'Starting Application...'}
          </p>
        </div>

        {/* Progress Section */}
        {state !== 'error' && (
          <div className="mb-6">
            {/* Progress Bar */}
            <div className="bg-border rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="bg-muted-foreground h-full rounded-full transition-all duration-300 ease-out progress-bar-shimmer"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Progress Text */}
            <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
              <span>{progress}% Complete</span>
              <span>{completedSteps.length} steps done</span>
            </div>

            {/* Current Step */}
            {currentStep && (
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0">
                  {state === 'retrying' ? (
                    <RefreshCw className="w-4 h-4 text-warning-bg animate-spin" />
                  ) : (
                    <Spinner size="sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {LOADING_MESSAGES[currentStep as keyof typeof LOADING_MESSAGES] ||
                      'Processing...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Steps */}
        {completedSteps.length > 0 && state !== 'error' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Completed:</h3>
            <div className="space-y-2">
              {completedSteps.slice(-3).map(step => (
                <div key={step} className="flex items-center space-x-2 text-sm text-success-text">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="capitalize">{step} loaded successfully</span>
                </div>
              ))}
              {completedSteps.length > 3 && (
                <div className="text-xs text-muted-foreground pl-6">
                  ... and {completedSteps.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && error && (
          <div className="mb-6">
            <div className="bg-danger-light border border-danger-border rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-danger-bg flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-validation-error-text mb-1">
                    {typeof error === 'string' ? error : error.message}
                  </h4>
                  {typeof error === 'object' && (
                    <p className="text-sm text-validation-error-text">
                      Step: {error.step} ({error.code})
                    </p>
                  )}
                  {typeof error === 'object' && error.retryable && (
                    <p className="text-xs text-danger-text mt-2">
                      This error can be retried. Check your internet connection and try again.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Debug info - development only */}
            {env.isDev() && typeof error === 'object' && error.details && (
              <details className="mb-4">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Debug Information
                </summary>
                <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {state === 'error' && canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          {onCancel && (
            <button onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
          )}
        </div>

        {/* Loading Timeout Warning */}
        {state === 'initializing' && progress === 0 && (
          <div className="mt-6 px-3 py-2 bg-warning-light border-l-4 border-l-warning-bg rounded-lg shadow-sm">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-warning-bg flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-text">
                Taking longer than expected? Check your internet connection.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Simplified loading spinner for quick transitions */
export function AppLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-3">
        <Spinner size="md" />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
