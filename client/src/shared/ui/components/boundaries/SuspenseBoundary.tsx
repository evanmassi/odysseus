/**
 * Suspense Boundary Component
 * 
 * Professional Suspense boundary with proper error handling and loading states
 * Provides consistent lazy loading experience across the application
 */

import type { ReactNode } from 'react';
import React, { Suspense } from 'react';

import { env } from '@shared/config';

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

const DefaultLoadingFallback: React.FC<DefaultLoadingFallbackProps> = ({ name, className = '', 'aria-label': ariaLabel }) => (
  <div 
    className={`flex items-center justify-center p-8 ${className}`}
    role="status"
    aria-label={ariaLabel ?? `Loading ${name ?? 'component'}...`}
  >
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent" />
      <span className="text-neutral-600 text-sm">
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
  const defaultErrorFallback = React.useCallback(
    ({ error, retry }: { error: Error; retry: () => void }) => (
      <div 
        className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
        role="alert"
        aria-label={`Error loading ${name ?? 'component'}`}
      >
        <div className="text-error-500 mb-4">
          <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Failed to load {name ?? 'component'}
        </h3>
        
        <p className="text-neutral-600 mb-4 max-w-sm">
          {error.message || 'Something went wrong while loading this component.'}
        </p>
        
        <button
          onClick={retry}
          className="btn px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    ),
    [className, name]
  );
  
  // Default loading fallback with timeout
  const loadingFallback = fallback || (
    <DefaultLoadingFallback 
      name={name} 
      className={className}
      aria-label={ariaLabel}
    />
  );
  
  // Error boundary configuration - omit children since we use JSX children pattern
  const errorBoundaryConfig: Omit<ErrorBoundaryProps, 'children'> = {
    fallback: errorFallback || defaultErrorFallback,
    onError: (error, errorInfo) => {
      // Log error for debugging
      if (env.isDev()) {
        console.group(`🚨 Lazy Loading Error: ${name || 'Unknown Component'}`);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.groupEnd();
      }
      
      // Call custom error handler
      onError?.(error, errorInfo);
    },
    isolate: true, // Prevent error propagation to parent boundaries
  };
  
  return (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Convenience wrapper for lazy components
export const withSuspenseBoundary = <P extends object>(
  LazyComponent: React.ComponentType<P>,
  config?: Omit<SuspenseBoundaryProps, 'children'>
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <SuspenseBoundary {...config}>
      <LazyComponent {...(props as any)} ref={ref} />
    </SuspenseBoundary>
  ));
  
  WrappedComponent.displayName = `withSuspenseBoundary(${LazyComponent.displayName || LazyComponent.name})`;
  
  return WrappedComponent;
};

// Hook for managing lazy loading state
export const useLazyLoadingState = (componentName?: string) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  
  const handleLoadComplete = React.useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);
  
  const handleLoadError = React.useCallback((error: Error) => {
    setIsLoading(false);
    setError(error);
    
    if (env.isDev()) {
      console.error(`Failed to load lazy component: ${componentName}`, error);
    }
  }, [componentName]);
  
  const retry = React.useCallback(() => {
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
  importFn: () => Promise<{ default: React.ComponentType<any> }>
): Promise<void> => {
  try {
    await importFn();
  } catch (error) {
    if (env.isDev()) {
      console.warn('Failed to preload lazy component:', error);
    }
  }
};

// Batch preloader for multiple components
export const preloadLazyComponents = async (
  importFns: Array<() => Promise<{ default: React.ComponentType<any> }>>
): Promise<void> => {
  try {
    await Promise.all(importFns.map(preloadLazyComponent));
  } catch (error) {
    if (env.isDev()) {
      console.warn('Failed to preload some lazy components:', error);
    }
  }
};
