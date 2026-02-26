/**
 * AuthGateway - Authentication Router
 *
 * Routes to login/register based on authentication state.
 * AppBootstrapService handles initialization to avoid race conditions.
 */
import React, { useState } from 'react';

import { useBootstrapContext } from '@app/contexts/BootstrapContext';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { isAdminRole } from '@domains/authentication/types';

import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { SystemAdminSetup } from './SystemAdminSetup';

interface AuthGatewayProps {
  children?: React.ReactNode;
}

/**
 * Pure authentication router - no initialization logic
 * Uses BootstrapContext instead of direct useAppBootstrap()
 */
export function AuthGateway({ children }: AuthGatewayProps) {
  const { sessionStatus } = useAuthStore();
  const { isReady } = useBootstrapContext();

  if (!isReady) {
    return null;
  }

  if (sessionStatus === 'authenticated') {
    return <>{children}</>;
  }

  return <AuthUnauthenticatedRouter />;
}

/**
 * Router for unauthenticated users
 * Shows system admin setup banner when needed, plus login/register
 */
function AuthUnauthenticatedRouter() {
  const { flags } = useBootstrapContext();
  const [showRegister, setShowRegister] = useState(flags.firstTimeSetupRequired);

  // System admin setup auto-logs in on completion, so AuthGateway
  // naturally transitions to authenticated state via sessionStatus
  if (flags.needsSystemAdmin) {
    return <SystemAdminSetup />;
  }

  if (showRegister) {
    return <RegisterModal onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return <LoginModal onSwitchToRegister={() => setShowRegister(true)} />;
}

/**
 * Hook for components that need auth state
 */
export function useAuthGateway() {
  const { isAuthenticated, user } = useAuthStore();

  return {
    isAuthenticated,
    user,
    isAdmin: isAdminRole(user?.role),
    isUser: user?.role === 'user',
  };
}
