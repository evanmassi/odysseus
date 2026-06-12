/**
 * Application Root
 *
 * Top-level component that orchestrates bootstrap, routing, and global overlays.
 */

import { lazy, Suspense } from 'react';

import { Routes, Route } from 'react-router-dom';

import { useAppBootstrap } from '@app/bootstrap';
import { AppDashboard } from '@app/components/layout/AppDashboard';
import { AppErrorBoundary } from '@app/components/layout/AppErrorBoundary';
import { AppLoader } from '@app/components/layout/AppLoader';
import { BootstrapProvider } from '@app/contexts/BootstrapContext';
import { useAuthSocketSync, useSplashFloor } from '@app/hooks';
import { AppProviders } from '@app/providers/AppProviders';
import { useErrorStore } from '@app/stores';
import { AuthGateway, useAuthStore } from '@domains/authentication';
import { AuthEmailVerificationPage } from '@domains/authentication/ui/components/gateway/AuthEmailVerificationPage';
import { AuthSessionTimeoutModal } from '@domains/authentication/ui/components/gateway/AuthSessionTimeoutModal';
import { AuthPasswordResetPage } from '@domains/authentication/ui/components/password/AuthPasswordResetPage';
import { useUserSettingsQuery } from '@domains/users/hooks/useUserSettings';
import { ErrorBanner } from '@shared/ui';

// Minimum time the boot splash stays up so a fast bootstrap doesn't flash by.
const SPLASH_FLOOR_MS = 1000;

// Dev-only modal preview harness; the dynamic import is dead-code-eliminated from
// production builds, so neither the route nor its component ships.
const ModalPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import('@app/dev/ModalPreviewPage').then(module => ({ default: module.ModalPreviewPage }))
    )
  : null;

function AppContent() {
  // Only App.tsx calls useAppBootstrap() — other components use BootstrapContext
  const bootstrapState = useAppBootstrap();
  const { isReady, isLoading, isError, retry } = bootstrapState;
  const revealApp = useSplashFloor(isReady, SPLASH_FLOOR_MS);

  const { errors, clearErrors } = useErrorStore();
  const { isAuthenticated } = useAuthStore();

  useAuthSocketSync();
  useUserSettingsQuery({ enabled: isAuthenticated });

  if (isLoading || isError || !revealApp) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader context={bootstrapState} onRetry={retry} />
      </AppErrorBoundary>
    );
  }

  // Fallback loading state (should rarely be reached)
  if (!isReady) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto w-8 h-8"></div>
          <p className="text-lg font-medium text-secondary-foreground">Finalizing...</p>
        </div>
      </div>
    );
  }

  return (
    <BootstrapProvider value={bootstrapState}>
      <AppErrorBoundary onRetry={retry}>
        <Routes>
          <Route path="/verify-email" element={<AuthEmailVerificationPage />} />
          <Route path="/reset-password" element={<AuthPasswordResetPage />} />
          {ModalPreviewPage && (
            <Route
              path="/__dev/modals"
              element={
                <Suspense fallback={null}>
                  <ModalPreviewPage />
                </Suspense>
              }
            />
          )}
          <Route
            path="*"
            element={
              <AuthGateway>
                <AppDashboard />
              </AuthGateway>
            }
          />
        </Routes>

        <ErrorBanner errors={errors} onClear={clearErrors} />
        {isAuthenticated && <AuthSessionTimeoutModal />}
      </AppErrorBoundary>
    </BootstrapProvider>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
