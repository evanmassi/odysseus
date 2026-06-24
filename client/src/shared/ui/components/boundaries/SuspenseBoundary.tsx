/**
 * Suspense Boundary Component
 *
 * Suspense boundary with error handling and loading states.
 */

import type { ReactNode } from 'react';
import React, { Suspense, useCallback } from 'react';

import { logger } from '@infra/logger';
import { env } from '@shared/config';

import { Button } from '../../primitives';
import { OdysseusSpinner } from '../loading';

import { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  errorFallback?: ErrorBoundaryProps['fallback'];
  'aria-label'?: string;
  className?: string;
  name?: string;
}

interface DefaultLoadingFallbackProps {
  name?: string;
  className?: string;
  'aria-label'?: string;
}

const DefaultLoadingFallback: React.FC<DefaultLoadingFallbackProps> = ({
  name,
  className = '',
  'aria-label': ariaLabel,
}) => (
  <div
    className={`flex items-center justify-center p-8 ${className}`}
    role="status"
    aria-label={ariaLabel ?? `Loading ${name ?? 'component'}...`}
  >
    <div className="flex items-center space-x-3">
      <OdysseusSpinner size="md" className="text-primary" />
      <span className="text-muted-foreground text-body-sm">
        {name ? `Loading ${name}...` : 'Loading...'}
      </span>
    </div>
  </div>
);

export const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = ({
  children,
  fallback,
  onError,
  errorFallback,
  'aria-label': ariaLabel,
  className = '',
  name,
}) => {
  const defaultErrorFallback = useCallback(
    ({ error, retry }: { error: Error; retry: () => void }) => (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
        role="alert"
        aria-label={`Error loading ${name ?? 'component'}`}
      >
        <div className="text-danger-bg mb-4">
          <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-card-foreground mb-2">
          Failed to load {name ?? 'component'}
        </h3>

        <p className="text-muted-foreground mb-4 max-w-sm">
          {error.message || 'Something went wrong while loading this component.'}
        </p>

        <Button variant="primary" onClick={retry}>
          Try Again
        </Button>
      </div>
    ),
    [className, name]
  );

  const loadingFallback = fallback ?? (
    <DefaultLoadingFallback name={name} className={className} aria-label={ariaLabel} />
  );

  const errorBoundaryConfig: Omit<ErrorBoundaryProps, 'children'> = {
    fallback: errorFallback ?? defaultErrorFallback,
    onError: (error, errorInfo) => {
      if (env.isDev()) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty name shows 'Unknown Component'
        // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
        console.group(`🚨 Lazy Loading Error: ${name ?? 'Unknown Component'}`);
        logger.error('Error', { error });
        logger.error('Error Info', { errorInfo });
        // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
        console.groupEnd();
      }

      onError?.(error, errorInfo);
    },
    isolate: true,
  };

  return (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
};
