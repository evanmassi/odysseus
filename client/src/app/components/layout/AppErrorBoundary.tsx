/**
 * Application Error Boundary
 *
 * App-shell recovery screen — wraps the shared ErrorBoundary with a full-page
 * fallback offering retry, reload, go-home, and copy-details.
 */

import type { ErrorInfo, ReactNode } from 'react';

import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';

import { logger } from '@infra/logger';
import { env } from '@shared/config';
import { Button, ErrorBoundary } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

interface AppErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface AppErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  retry: () => void;
  errorId: string;
}

function copyErrorDetails({ error, errorInfo, errorId }: AppErrorFallbackProps): void {
  const details = {
    errorId,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  navigator.clipboard
    .writeText(JSON.stringify(details, null, 2))
    .then(() => notifications.success('Error details copied to clipboard'))
    .catch(() => notifications.error('Failed to copy error details'));
}

function AppErrorFallback(props: AppErrorFallbackProps) {
  const { error, errorInfo, retry, errorId } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-muted flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-danger-bg" />
          </div>

          <h1 className="text-2xl font-bold text-card-foreground mb-2">Something went wrong</h1>

          <p className="text-muted-foreground">
            The application encountered an unexpected error and needs to recover.
          </p>
        </div>

        <div className="bg-muted border border-danger-border rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Bug className="w-5 h-5 text-danger-text flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-body-sm font-medium text-danger-text mb-1">Error Details</h4>
              <p className="text-body text-danger-text break-words">
                {error.message ? error.message : 'Unknown error occurred'}
              </p>
              <p className="text-caption text-danger-text mt-2">Error ID: {errorId}</p>
            </div>
          </div>
        </div>

        {env.isDev() && error.stack && (
          <details className="mb-6">
            <summary className="text-body-sm text-muted-foreground cursor-pointer hover:text-accent-foreground mb-2">
              Stack Trace (Development)
            </summary>
            <pre className="text-data-sm text-muted-foreground p-3 bg-muted rounded-lg overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}

        {env.isDev() && errorInfo?.componentStack && (
          <details className="mb-6">
            <summary className="text-body-sm text-muted-foreground cursor-pointer hover:text-accent-foreground mb-2">
              Component Stack (Development)
            </summary>
            <pre className="text-data-sm text-muted-foreground p-3 bg-muted rounded-lg overflow-auto max-h-40">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}

        <div className="space-y-3 mb-6">
          <Button
            variant="primary"
            fullWidth
            onClick={retry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="cancel"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Reload Page
            </Button>

            <Button
              variant="cancel"
              onClick={() => {
                window.location.href = '/';
              }}
              leftIcon={<Home className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-body-sm font-medium text-card-foreground mb-3">Need Help?</h3>

          <div className="space-y-2">
            <button
              onClick={() => copyErrorDetails(props)}
              className="w-full text-left px-3 py-2 text-body-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Copy error details for support</span>
            </button>

            <p className="text-caption text-muted-foreground">
              If this error persists, please contact your system administrator with the error ID
              above.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center border-t border-border pt-4">
          <p className="text-caption text-muted-foreground">
            Odysseus Laboratory Management System
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children, onRetry }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name="App Shell"
      onRetry={onRetry}
      onError={(error, errorInfo, errorId) =>
        logger.error('App error boundary caught React error', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId,
        })
      }
      fallback={AppErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
}
