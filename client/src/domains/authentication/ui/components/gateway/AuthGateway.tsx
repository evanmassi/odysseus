/**
 * Authentication Gateway
 *
 * Routes to login/register based on authentication state.
 */
import React, { useState } from 'react';

import { useBootstrapContext } from '@app/contexts/BootstrapContext';
import { useDelayedTransition } from '@domains/authentication/hooks/useDelayedTransition';
import { useAuthStore } from '@domains/authentication/stores/authStore';

import { AuthGatewayPanel } from './AuthGatewayPanel';
import { AuthLoginModal } from './AuthLoginModal';
import { AuthRegistrationModal } from './AuthRegistrationModal';
import { AuthSysAdminSetupPage } from './AuthSysAdminSetupPage';

const SWAP_EXIT_MS = 200;

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

  return (
    <AuthGatewayPanel>
      <AuthUnauthenticatedRouter />
    </AuthGatewayPanel>
  );
}

function AuthUnauthenticatedRouter() {
  const { flags } = useBootstrapContext();
  const [inputShowRegister, setInputShowRegister] = useState(flags.firstTimeSetupRequired);
  const { displayed: showRegister, isTransitioning } = useDelayedTransition(
    inputShowRegister,
    SWAP_EXIT_MS
  );

  // Sysadmin setup auto-logs in on completion; AuthGateway transitions to the
  // authenticated branch via sessionStatus rather than via a separate done callback.
  if (flags.needsSystemAdmin) {
    return <AuthSysAdminSetupPage />;
  }

  return (
    <div className={isTransitioning ? 'animate-auth-stack-exit' : ''}>
      {showRegister ? (
        <AuthRegistrationModal onSwitchToLogin={() => setInputShowRegister(false)} />
      ) : (
        <AuthLoginModal onSwitchToRegister={() => setInputShowRegister(true)} />
      )}
    </div>
  );
}
