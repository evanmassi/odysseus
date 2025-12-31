/**
 * Application Providers Setup
 *
 * Clean composition root that eliminates provider hell from App.tsx.
 * Centralizes all app-wide providers in proper order.
 */
import React, { Component } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Performance debugging removed for clean build
import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';
import {
  ConnectionStatusIndicator,
  RealtimeSyncIndicator,
  OfflineBanner,
} from '@shared/ui/components/ConnectionStatusIndicator';

import { queryClient } from './queryClient';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root providers wrapper for the entire application
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* React Query DevTools - only in development */}
      {env.isDev() && <ReactQueryDevtools initialIsOpen={false} />}

      {/* Cache Performance Monitoring - only in development */}
      {/* Performance debugging removed for clean build */}

      {/* Connection Status & Real-time Indicators */}
      <OfflineBanner />
      <RealtimeSyncIndicator />
      <ConnectionStatusIndicator />

      {/* Toast notifications - custom Toast component handles styling */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom error boundary for global error handling
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('App Error Boundary caught error', { error, errorInfo });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-odysseus-dark flex items-center justify-center">
          <div className="bg-odysseus-surface rounded-lg p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-odysseus-muted mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Combined app providers with error boundary
 */
export function AppProviders({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <Providers>{children}</Providers>
    </ErrorBoundary>
  );
}
