/**
 * Authentication Gateway
 *
 * Routes to login/register based on authentication state.
 */
import { useState, type ReactNode } from 'react';

import { useBootstrapContext } from '@app/contexts/BootstrapContext';
import { useAuthStackTransition } from '@domains/authentication/hooks/useAuthStackTransition';
import { useFirstTimeSetupQuery } from '@domains/authentication/hooks/useFirstTimeSetupQuery';
import { useAuthStore } from '@domains/authentication/stores/authStore';

import { AuthGatewayPanel } from './AuthGatewayPanel';
import { AuthLoginModal } from './AuthLoginModal';
import { AuthRegistrationModal } from './AuthRegistrationModal';
import { AuthSysAdminSetupPage } from './AuthSysAdminSetupPage';

interface AuthGatewayProps {
  children?: ReactNode;
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
  const { data } = useFirstTimeSetupQuery();
  const [inputShowRegister, setInputShowRegister] = useState(data?.isFirstTime ?? false);
  const { state: showRegister, exitClass } = useAuthStackTransition(inputShowRegister);

  // Sysadmin setup auto-logs in on completion; AuthGateway transitions to the
  // authenticated branch via sessionStatus rather than via a separate done callback.
  if (data?.needsSystemAdmin) {
    return <AuthSysAdminSetupPage />;
  }

  return (
    <div className={exitClass}>
      {showRegister ? (
        <AuthRegistrationModal onSwitchToLogin={() => setInputShowRegister(false)} />
      ) : (
        <AuthLoginModal onSwitchToRegister={() => setInputShowRegister(true)} />
      )}
    </div>
  );
}
