/**
 * Application Providers
 *
 * Wraps app with React Query, theming, tooltips, and toast notifications
 */
import React, { Component, useEffect, useRef } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';
import { Button } from '@shared/ui';
import {
  ConnectionStatusIndicator,
  RealtimeSyncIndicator,
} from '@shared/ui/components/ConnectionStatusIndicator';
import { notifications } from '@shared/utils/notifications';

import { queryClient, setupQueryPersistence } from '../cache/queryClient';
import { ThemeProvider } from '../contexts/ThemeContext';

// Dev-only: Expose notifications to console for testing
if (env.isDev()) {
  (window as unknown as { __notifications: typeof notifications }).__notifications = notifications;
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const persistenceInitialized = useRef(false);

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
          <RealtimeSyncIndicator />
          <ConnectionStatusIndicator />

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
        <div className="min-h-screen bg-foreground flex items-center justify-center">
          <div className="bg-card rounded-lg p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold text-danger-text mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <Providers>{children}</Providers>
    </ErrorBoundary>
  );
}
