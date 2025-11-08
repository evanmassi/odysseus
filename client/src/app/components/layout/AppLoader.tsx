/**
 * App Loader Component
 *
 * Loading screen with detailed progress feedback and error recovery options.
 */

import React from 'react';

import { Loader2, AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

import { env } from '@shared/config/environment';

import { BOOTSTRAP_STEPS, LOADING_MESSAGES } from '../../bootstrap/constants';

import type { UseAppBootstrapResult } from '../../bootstrap/types';

interface AppLoaderProps {
  context: UseAppBootstrapResult;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function AppLoader({ context, onRetry, onCancel }: AppLoaderProps) {
  const { state, progress, currentStep, error, canRetry, completedSteps } = context;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {state === 'error' ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : state === 'retrying' ? (
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            ) : (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Odysseus
          </h1>
          
          <p className="text-gray-600">
            {state === 'error' 
              ? 'Initialization Failed'
              : state === 'retrying'
              ? 'Retrying Connection...'
              : 'Starting Application...'
            }
          </p>
        </div>

        {/* Progress Section */}
        {state !== 'error' && (
          <div className="mb-6">
            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Progress Text */}
            <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
              <span>{progress}% Complete</span>
              <span>{completedSteps.length} steps done</span>
            </div>

            {/* Current Step */}
            {currentStep && (
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  {state === 'retrying' ? (
                    <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {LOADING_MESSAGES[currentStep as keyof typeof LOADING_MESSAGES] || 'Processing...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Steps (Success Indicators) */}
        {completedSteps.length > 0 && state !== 'error' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Completed:</h3>
            <div className="space-y-2">
              {completedSteps.slice(-3).map((step) => ( // Show last 3 completed steps
                <div key={step} className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="capitalize">{step} loaded successfully</span>
                </div>
              ))}
              {completedSteps.length > 3 && (
                <div className="text-xs text-gray-500 pl-6">
                  ... and {completedSteps.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && error && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-1">
                    {typeof error === 'string' ? error : error.message}
                  </h4>
                  {typeof error === 'object' && (
                    <p className="text-sm text-red-700">
                      Step: {error.step} ({error.code})
                    </p>
                  )}
                  {typeof error === 'object' && error.retryable && (
                    <p className="text-xs text-red-600 mt-2">
                      This error can be retried. Check your internet connection and try again.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Details (Debug Info) */}
            {env.isDev() && typeof error === 'object' && error.details && (
              <details className="mb-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Debug Information
                </summary>
                <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded overflow-auto">
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
            <button
              onClick={onCancel}
              className="btn-cancel"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Loading Timeout Warning */}
        {state === 'initializing' && progress === 0 && (
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Taking longer than expected?</p>
                <p className="text-yellow-700 mt-1">
                  Check your internet connection. The app will automatically retry if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Liquid Nitrogen Tube Inventory System
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Professional Laboratory Management
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified loading spinner for quick transitions
 */
export function AppLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-gray-600">{message}</span>
      </div>
    </div>
  );
}

// Named exports only - no default export needed
