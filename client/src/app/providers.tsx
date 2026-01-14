/**
 * Application Providers Setup
 *
 * Clean composition root that eliminates provider hell from App.tsx.
 * Centralizes all app-wide providers in proper order.
 */
import React, { Component, useEffect, useRef } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Performance debugging removed for clean build
import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';
import {
  ConnectionStatusIndicator,
  RealtimeSyncIndicator,
} from '@shared/ui/components/ConnectionStatusIndicator';
import { notifications } from '@shared/utils/notifications';

import { ThemeProvider } from './contexts/ThemeContext';
import { queryClient, setupQueryPersistence } from './queryClient';

// Dev-only: Expose notifications to console for testing
if (env.isDev()) {
  (window as unknown as { __notifications: typeof notifications }).__notifications = notifications;
}

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root providers wrapper for the entire application
 */
export function Providers({ children }: ProvidersProps) {
  const persistenceInitialized = useRef(false);

  // Initialize query cache persistence once on mount
  useEffect(() => {
    if (!persistenceInitialized.current) {
      setupQueryPersistence();
      persistenceInitialized.current = true;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={300}>
          {/* Cache Performance Monitoring - only in development */}
          {/* Performance debugging removed for clean build */}

          {/* Connection Status & Real-time Indicators */}
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
        </TooltipPrimitive.Provider>
      </ThemeProvider>
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
        <div className="min-h-screen bg-dark flex items-center justify-center">
          <div className="bg-surface rounded-lg p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-text-muted mb-4">
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
