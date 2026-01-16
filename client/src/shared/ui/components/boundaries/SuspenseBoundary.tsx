/**
 * Suspense Boundary Component
 *
 * Suspense boundary with error handling and loading states.
 * Provides consistent lazy loading experience across the application.
 */

import type { ReactNode } from 'react';
import React, { Suspense, useCallback, useState, forwardRef } from 'react';

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

import { Button } from '../../primitives';

import { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';

// Suspense boundary configuration
interface SuspenseBoundaryProps {
  children: ReactNode;

  // Loading fallback
  fallback?: ReactNode;

  // Error handling
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  errorFallback?: ErrorBoundaryProps['fallback'];

  // Accessibility
  'aria-label'?: string;

  // Performance
  timeout?: number; // Max time before showing error

  // Styling
  className?: string;

  // Debug info
  name?: string; // For debugging lazy loading
}

// Default loading fallback
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
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      <span className="text-muted-foreground text-sm">
        {name ? `Loading ${name}...` : 'Loading...'}
      </span>
    </div>
  </div>
);

// Main Suspense Boundary component
export const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = ({
  children,
  fallback,
  onError,
  errorFallback,
  'aria-label': ariaLabel,
  timeout: _timeout = 10000, // 10 second timeout
  className = '',
  name,
}) => {
  // Default error fallback
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

  // Default loading fallback with timeout
  const loadingFallback = fallback ?? (
    <DefaultLoadingFallback name={name} className={className} aria-label={ariaLabel} />
  );

  // Error boundary configuration - omit children since we use JSX children pattern
  const errorBoundaryConfig: Omit<ErrorBoundaryProps, 'children'> = {
    fallback: errorFallback ?? defaultErrorFallback,
    onError: (error, errorInfo) => {
      // Log error for debugging
      if (env.isDev()) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty name shows 'Unknown Component'
        // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
        console.group(`🚨 Lazy Loading Error: ${name ?? 'Unknown Component'}`);
        logger.error('Error', { error });
        logger.error('Error Info', { errorInfo });
        // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
        console.groupEnd();
      }

      // Call custom error handler
      onError?.(error, errorInfo);
    },
    isolate: true, // Prevent error propagation to parent boundaries
  };

  return (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
};

// Convenience wrapper for lazy components
export const withSuspenseBoundary = <P extends object>(
  LazyComponent: React.ComponentType<P>,
  config?: Omit<SuspenseBoundaryProps, 'children'>
) => {
  const WrappedComponent = forwardRef<unknown, P>((props, ref) => {
    // Conditionally pass ref only if it exists
    const componentProps = ref ? { ...props, ref: ref as React.Ref<unknown> } : props;

    return (
      <SuspenseBoundary {...config}>
        <LazyComponent {...(componentProps as P)} />
      </SuspenseBoundary>
    );
  });

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for React displayName
  WrappedComponent.displayName = `withSuspenseBoundary(${LazyComponent.displayName || LazyComponent.name})`;

  return WrappedComponent;
};

// Hook for managing lazy loading state
export const useLazyLoadingState = (componentName?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleLoadError = useCallback(
    (error: Error) => {
      setIsLoading(false);
      setError(error);

      if (env.isDev()) {
        logger.error(`Failed to load lazy component: ${componentName}`, { error });
      }
    },
    [componentName]
  );

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Component will re-mount and attempt to load again
  }, []);

  return {
    isLoading,
    error,
    handleLoadComplete,
    handleLoadError,
    retry,
  };
};

// Preloading utilities for better UX
export const preloadLazyComponent = async (
  importFn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>
): Promise<void> => {
  try {
    await importFn();
  } catch (error) {
    if (env.isDev()) {
      logger.warn('Failed to preload lazy component', { error });
    }
  }
};

// Batch preloader for multiple components
export const preloadLazyComponents = async (
  importFns: Array<() => Promise<{ default: React.ComponentType<Record<string, unknown>> }>>
): Promise<void> => {
  try {
    await Promise.all(importFns.map(preloadLazyComponent));
  } catch (error) {
    if (env.isDev()) {
      logger.warn('Failed to preload some lazy components', { error });
    }
  }
};
