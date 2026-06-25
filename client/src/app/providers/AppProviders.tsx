/**
 * Application Providers
 *
 * Wraps app with React Query, theming, tooltips, and toast notifications
 */
import React, { useEffect, useRef } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ConnectionStatusIndicator } from '@app/components/layout/ConnectionStatusIndicator';
import { RealtimeSyncIndicator } from '@app/components/layout/RealtimeSyncIndicator';
import { logger } from '@infra/logger';
import { env } from '@shared/config';
import { ErrorBoundary } from '@shared/ui';
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

export function AppProviders({ children }: ProvidersProps) {
  return (
    <ErrorBoundary
      level="page"
      name="Application"
      onError={(error, errorInfo, errorId) =>
        logger.error('App error boundary caught error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          errorId,
        })
      }
    >
      <Providers>{children}</Providers>
    </ErrorBoundary>
  );
}
