import React from 'react';

import { Routes, Route } from 'react-router-dom';

import { useAppBootstrap } from '@app/bootstrap';
import { AppDashboard } from '@app/components/layout/AppDashboard';
import { AppErrorBoundary } from '@app/components/layout/AppErrorBoundary';
import { AppLoader } from '@app/components/layout/AppLoader';
import { BootstrapProvider } from '@app/contexts/BootstrapContext';
import { useAuthSocketSync } from '@app/hooks';
import { AppProviders } from '@app/providers/AppProviders';
import { useErrorStore } from '@app/stores';
import { AuthGateway, useAuthStore } from '@domains/authentication';
import { AuthEmailVerificationPage } from '@domains/authentication/ui/components/gateway/AuthEmailVerificationPage';
import { AuthSessionTimeoutModal } from '@domains/authentication/ui/components/gateway/AuthSessionTimeoutModal';
import { AuthPasswordResetPage } from '@domains/authentication/ui/components/password/AuthPasswordResetPage';
import { useUserSettingsQuery } from '@domains/users/hooks/useUserSettings';
import { ErrorBanner } from '@shared/ui';

// Inner app component that uses React Query hooks - must be inside QueryClientProvider
function AppContent() {
  // Only App.tsx calls useAppBootstrap() - other components use BootstrapContext
  const bootstrapState = useAppBootstrap();
  const { isReady, isLoading, isError, retry } = bootstrapState;

  // State for UI components
  const { errors, clearErrors } = useErrorStore();
  const { isAuthenticated } = useAuthStore();

  useAuthSocketSync();

  // Prefetch user settings in background (only when authenticated)
  // Settings are cached by React Query and available throughout the app
  useUserSettingsQuery({ enabled: isAuthenticated });

  // Show loading screen during bootstrap
  if (isLoading) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader context={bootstrapState} onRetry={retry} />
      </AppErrorBoundary>
    );
  }

  // Show error state if bootstrap failed
  if (isError) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader context={bootstrapState} onRetry={retry} />
      </AppErrorBoundary>
    );
  }

  // App is ready - render main interface (data guaranteed to be loaded)
  if (!isReady) {
    // Fallback loading state (should rarely be reached)
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto w-8 h-8"></div>
          <p className="text-lg font-medium text-secondary-foreground">Finalizing...</p>
        </div>
      </div>
    );
  }

  // Main app interface (all data guaranteed to be loaded)
  return (
    <BootstrapProvider value={bootstrapState}>
      <AppErrorBoundary onRetry={retry}>
        <Routes>
          {/* Public route for email verification */}
          <Route path="/verify-email" element={<AuthEmailVerificationPage />} />

          {/* Public route for password reset */}
          <Route path="/reset-password" element={<AuthPasswordResetPage />} />

          {/* Main app route */}
          <Route
            path="*"
            element={
              <AuthGateway>
                <AppDashboard />
              </AuthGateway>
            }
          />
        </Routes>

        {/* UI overlays and notifications */}
        <ErrorBanner errors={errors} onClear={clearErrors} />

        {/* Session timeout warning - only relevant when authenticated */}
        {isAuthenticated && <AuthSessionTimeoutModal />}
      </AppErrorBoundary>
    </BootstrapProvider>
  );
}

// Root App component - sets up providers first, then renders content
export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
