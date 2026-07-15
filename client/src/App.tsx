/**
 * Application Root
 *
 * Top-level component that orchestrates bootstrap, routing, and global overlays.
 */

import { lazy, Suspense } from 'react';

import { Routes, Route } from 'react-router-dom';

import { useAppBootstrap } from '@app/bootstrap';
import { AppDashboard } from '@app/components/layout/AppDashboard';
import { AppErrorBanner } from '@app/components/layout/AppErrorBanner';
import { AppErrorBoundary } from '@app/components/layout/AppErrorBoundary';
import { AppLoader } from '@app/components/layout/AppLoader';
import { BootstrapProvider } from '@app/contexts/BootstrapContext';
import { useAuthSocketSync, useServerThemeSync, useSplashFloor } from '@app/hooks';
import { AppProviders } from '@app/providers/AppProviders';
import { useErrorStore } from '@app/stores/errorStore';
import {
  AuthGateway,
  useAuthStore,
  AuthEmailVerificationPage,
  AuthSessionTimeoutModal,
  AuthPasswordResetPage,
} from '@domains/authentication';

// Minimum time the boot splash stays up so a fast bootstrap doesn't flash by.
const SPLASH_FLOOR_MS = 1000;

// Dev-only surface preview harness; the dynamic import is dead-code-eliminated from
// production builds, so neither the route nor its component ships.
const SurfacePreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import('@app/dev/SurfacePreviewPage').then(module => ({ default: module.SurfacePreviewPage }))
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
  useServerThemeSync();

  if (isLoading || isError || !revealApp) {
    return (
      <AppErrorBoundary onRetry={retry}>
        <AppLoader context={bootstrapState} onRetry={retry} />
      </AppErrorBoundary>
    );
  }

  return (
    <BootstrapProvider value={bootstrapState}>
      <AppErrorBoundary onRetry={retry}>
        <Routes>
          <Route path="/verify-email" element={<AuthEmailVerificationPage />} />
          <Route path="/reset-password" element={<AuthPasswordResetPage />} />
          {SurfacePreviewPage && (
            <Route
              path="/__dev/modals"
              element={
                <Suspense fallback={null}>
                  <SurfacePreviewPage />
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

        <AppErrorBanner errors={errors} onClear={clearErrors} />
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
