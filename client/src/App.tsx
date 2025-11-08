import React from 'react';

import { Routes, Route } from 'react-router-dom';

import { useAppBootstrap } from '@app/bootstrap';
import { AppErrorBoundary } from '@app/components/boundaries/AppErrorBoundary';
import { AppLoader } from '@app/components/layout/AppLoader';
import { Dashboard } from '@app/components/layout/Dashboard';
import { BootstrapProvider } from '@app/contexts/BootstrapContext';
import { AppProviders } from '@app/providers';
import { useErrorStore } from '@app/stores';
import { AuthGateway, useAuthStore } from '@domains/authentication';
import { useUserSettingsQuery } from '@domains/authentication/hooks/useUserSettings';
import { ResetPasswordPage } from '@domains/authentication/ui/components/ResetPasswordPage';
import { VerifyEmailPage } from '@domains/authentication/ui/components/VerifyEmailPage';
import { useTubeStore } from '@domains/tubes';

// Import app-layer components (moved from @shared)
import { ErrorBanner, ConnectionIndicator } from '@shared/ui';

import '@shared/styles/legacy/notifications.css';
import '@shared/styles/legacy/keyboardNavigation.css';

// Inner app component that uses React Query hooks - must be inside QueryClientProvider
function AppContent() {
  // ARCHITECTURAL IMPROVEMENT: Single bootstrap initialization
  // Only App.tsx calls useAppBootstrap() - all other components use BootstrapContext
  const bootstrapState = useAppBootstrap();
  const { isReady, isLoading, isError, context, retry } = bootstrapState;

  // State for UI components
  const { errors, clearErrors } = useErrorStore();
  const { isConnected } = useTubeStore();
  const { isAuthenticated } = useAuthStore();

  // Prefetch user settings in background (only when authenticated)
  // Settings are cached by React Query and available throughout the app
  const { } = useUserSettingsQuery({ enabled: isAuthenticated });

  // Show loading screen during bootstrap
  if (isLoading) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader 
          context={bootstrapState}
          onRetry={retry}
        />
      </AppErrorBoundary>
    );
  }

  // Show error state if bootstrap failed
  if (isError) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader 
          context={bootstrapState}
          onRetry={retry}
        />
      </AppErrorBoundary>
    );
  }

  // App is ready - render main interface (data guaranteed to be loaded)
  if (!isReady) {
    // Fallback loading state (should rarely be reached)
    return (
      <div className="min-h-screen bg-odysseus-gray flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto w-8 h-8"></div>
          <p className="text-lg font-medium text-gray-700">Finalizing...</p>
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
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Public route for password reset */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Main app route */}
          <Route path="*" element={
            <AuthGateway>
              <Dashboard />
            </AuthGateway>
          } />
        </Routes>

        {/* UI overlays and notifications */}
        <ErrorBanner errors={errors} onClear={clearErrors} />
        <ConnectionIndicator connected={isConnected} />
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
