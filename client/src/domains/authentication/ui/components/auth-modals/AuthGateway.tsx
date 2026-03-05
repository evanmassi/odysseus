/**
 * Authentication Gateway
 *
 * Routes to login/register based on authentication state.
 */
import React, { useState } from 'react';

import { useBootstrapContext } from '@app/contexts/BootstrapContext';
import { useAuthStore } from '@domains/authentication/stores/authStore';

import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { SystemAdminSetupPage } from './SystemAdminSetupPage';

interface AuthGatewayProps {
  children?: React.ReactNode;
}

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

function AuthUnauthenticatedRouter() {
  const { flags } = useBootstrapContext();
  const [showRegister, setShowRegister] = useState(flags.firstTimeSetupRequired);

  // System admin setup auto-logs in on completion, so AuthGateway
  // naturally transitions to authenticated state via sessionStatus
  if (flags.needsSystemAdmin) {
    return <SystemAdminSetupPage />;
  }

  if (showRegister) {
    return <RegisterModal onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return <LoginModal onSwitchToRegister={() => setShowRegister(true)} />;
}
