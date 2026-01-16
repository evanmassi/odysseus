/**
 * Error Boundary Component
 *
 * Error boundary with retry functionality and error reporting.
 * Handles runtime errors in React component tree.
 */

import type { ReactNode, ErrorInfo } from 'react';
import React, {
  Component,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  createElement,
} from 'react';

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

import { Button } from '../../primitives';

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Error boundary props
export interface ErrorBoundaryProps {
  children: ReactNode;

  // Error handling
  fallback?:
    | React.ComponentType<{
        error: Error;
        errorInfo: ErrorInfo | null;
        retry: () => void;
        errorId: string;
      }>
    | ((props: {
        error: Error;
        errorInfo: ErrorInfo | null;
        retry: () => void;
        errorId: string;
      }) => ReactNode);

  // Callbacks
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  onRetry?: () => void;

  // Configuration
  isolate?: boolean; // Prevent error propagation
  level?: 'page' | 'section' | 'component'; // Error boundary level

  // Debugging
  name?: string; // For debugging purposes
}

// Default error fallback component
interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  retry: () => void;
  errorId: string;
  level?: string;
  name?: string;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  retry,
  errorId,
  level = 'component',
  name,
}) => {
  const isDevelopment = env.isDev();

  return (
    <div
      className="flex flex-col items-center justify-center p-8 min-h-[200px] border-2 border-dashed border-danger-border bg-danger-light rounded-lg"
      role="alert"
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for display: empty name falls through to level
      aria-label={`Error in ${name || level}`}
    >
      <div className="text-danger-bg mb-4">
        <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-validation-error-text mb-2">Something went wrong</h2>

      <p className="text-danger-text text-center mb-4 max-w-md">
        {isDevelopment ? error.message : `An error occurred while rendering this ${level}.`}
      </p>

      {isDevelopment && (
        <details className="mb-4 max-w-2xl w-full">
          <summary className="cursor-pointer text-danger-text font-medium mb-2">
            Error Details
          </summary>
          <div className="bg-muted p-4 rounded border border-danger-border text-sm font-mono text-card-foreground overflow-auto max-h-40">
            <div className="mb-2">
              <strong>Error ID:</strong> {errorId}
            </div>
            <div className="mb-2">
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug display: empty name shows 'Unknown' */}
              <strong>Component:</strong> {name || 'Unknown'}
            </div>
            <div className="mb-2">
              <strong>Message:</strong> {error.message}
            </div>
            {error.stack && (
              <div>
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex space-x-3">
        <Button variant="danger" onClick={retry}>
          Try Again
        </Button>

        {isDevelopment && (
          <Button
            variant="secondary"
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty name shows 'Unknown'
              // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
              console.group(`🚨 Error Boundary: ${name ?? 'Unknown'}`);
              logger.error('Error', { error });
              logger.error('Error ID', { errorId });
              // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
              console.groupEnd();
            }}
          >
            Log to Console
          </Button>
        )}
      </div>

      {level === 'page' && (
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-danger-text hover:text-danger-bg underline text-sm"
        >
          Reload Page
        </button>
      )}
    </div>
  );
};

// Generate unique error ID
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Main Error Boundary class component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorId: string = '';

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateErrorId();

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error ID is invalid, generate unique ID
    const errorId = this.state.errorId || generateErrorId();

    this.setState({
      errorInfo,
      errorId,
    });

    // Log error for monitoring
    if (env.isDev()) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty name shows 'Unknown'
      // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
      console.group(`🚨 Error Boundary Caught Error: ${this.props.name ?? 'Unknown'}`);
      logger.error('Error', { error });
      logger.error('Error Info', { errorInfo });
      logger.error('Error ID', { errorId });
      // eslint-disable-next-line no-console -- Development-only error logging (environment-gated)
      console.groupEnd();
    }

    // Call error callback
    this.props.onError?.(error, errorInfo, errorId);

    // In production, you might want to send this to an error reporting service
    if (env.isProd()) {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   tags: {
      //     errorBoundary: this.props.name || 'unknown',
      //     errorId,
      //   },
      //   extra: errorInfo,
      // });
    }
  }

  handleRetry = () => {
    this.props.onRetry?.();

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;

      const fallbackProps = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        retry: this.handleRetry,
        errorId: this.state.errorId!,
        level: this.props.level,
        name: this.props.name,
      };

      // Handle function vs component fallback
      if (typeof FallbackComponent === 'function') {
        return <FallbackComponent {...fallbackProps} />;
      } else {
        return createElement(FallbackComponent, fallbackProps);
      }
    }

    return this.props.children;
  }
}

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {
    setError(error);

    // Log error
    if (env.isDev()) {
      logger.error('Handled error', { error });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Re-throw error to be caught by error boundary
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError, error };
};

// Higher-order component for error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = forwardRef<unknown, P>((props, ref) => {
    // Conditionally pass ref only if it exists
    const componentProps = ref ? { ...props, ref: ref as React.Ref<unknown> } : props;

    return (
      <ErrorBoundary {...errorBoundaryConfig}>
        <Component {...(componentProps as P)} />
      </ErrorBoundary>
    );
  });

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for React displayName
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Error boundary for specific scenarios
export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="page" />
);

export const SectionErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="section" />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="component" />
);
