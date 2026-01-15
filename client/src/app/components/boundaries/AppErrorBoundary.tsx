/**
 * Application Error Boundary
 *
 * Error recovery component for graceful failure handling.
 * Catches React errors and provides recovery options.
 */

import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';

import { env } from '@shared/config/environment';
import { logger } from '@shared/infrastructure/logger';

import type { AppInitializationError } from '@shared/errors/AppError';

interface AppErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substring(2),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    logger.error('Error boundary caught React error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (env.isProd()) {
      this.reportError(error, errorInfo);
    }
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    logger.info('Error would be reported to monitoring service', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
    });
  }

  private handleRetry = (): void => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private copyErrorDetails = (): void => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      componentStack: this.state.errorInfo?.componentStack,
    };

    navigator.clipboard
      .writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard');
      })
      .catch(() => {
        alert('Failed to copy error details');
      });
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-danger-light to-warning-light flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl p-8 w-full max-w-lg">
            {/* Error Icon and Title */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-danger-bg" />
              </div>

              <h1 className="text-2xl font-bold text-card-foreground mb-2">Something went wrong</h1>

              <p className="text-muted-foreground">
                The application encountered an unexpected error and needs to recover.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-danger-light border border-danger-border rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Bug className="w-5 h-5 text-danger-bg flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-validation-error-text mb-1">
                    Error Details
                  </h4>
                  <p className="text-sm text-validation-error-text break-words">
                    {this.state.error?.message ?? 'Unknown error occurred'}
                  </p>
                  <p className="text-xs text-danger-text mt-2">Error ID: {this.state.errorId}</p>
                </div>
              </div>
            </div>

            {/* Debug Information (Development Only) */}
            {env.isDev() && this.state.error?.stack && (
              <details className="mb-6">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-accent-foreground mb-2">
                  🔧 Stack Trace (Development)
                </summary>
                <pre className="text-xs text-muted-foreground p-3 bg-muted rounded-lg overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-accent-foreground mt-3 mb-2">
                      🧩 Component Stack
                    </summary>
                    <pre className="text-xs text-muted-foreground p-3 bg-muted rounded-lg overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </details>
            )}

            {/* Recovery Actions */}
            <div className="space-y-3 mb-6">
              {/* Primary Recovery Action */}
              {this.props.onRetry && (
                <button
                  onClick={this.handleRetry}
                  className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              )}

              {/* Secondary Recovery Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleReload}
                  className="btn-cancel flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Page</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="btn-cancel flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </button>
              </div>
            </div>

            {/* Support Actions */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-card-foreground mb-3">Need Help?</h3>

              <div className="space-y-2">
                <button
                  onClick={this.copyErrorDetails}
                  className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Copy error details for support</span>
                </button>

                <p className="text-xs text-muted-foreground">
                  If this error persists, please contact your system administrator with the error ID
                  above.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Odysseus Laboratory Management System</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Bootstrap-specific error component for initialization failures
 */
interface BootstrapErrorProps {
  error: AppInitializationError;
  onRetry?: () => void;
  canRetry?: boolean;
}

export function BootstrapError({ error, onRetry, canRetry }: BootstrapErrorProps) {
  return (
    <div className="bg-danger-light border border-danger-border rounded-lg p-6">
      <div className="flex items-start space-x-4">
        <AlertTriangle className="w-6 h-6 text-danger-bg flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-validation-error-text mb-2">
            Initialization Failed
          </h3>
          <p className="text-validation-error-text mb-3">{error.message}</p>
          <div className="text-sm text-danger-text mb-4">
            <p>
              Phase: <span className="font-mono">{error.phase}</span>
            </p>
            <p>
              Code: <span className="font-mono">{error.code}</span>
            </p>
          </div>

          {canRetry && error.retryable && onRetry && (
            <button onClick={onRetry} className="btn-danger inline-flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Retry Initialization</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Named exports only - no default export needed
