/**
 * AuthGateway - Pure UI Authentication Router
 *
 * Pure UI routing component with zero business logic.
 * AppBootstrapService handles authentication initialization,
 * eliminating duplicate auth flows and race conditions.
 */
import React from 'react';

import { useBootstrapContext } from '@app/contexts/BootstrapContext';
import { useAuthStore } from '@domains/authentication/stores/authStore';

import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';

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
  
  // Wait for bootstrap to complete - no duplicate initialization
  if (!isReady) {
    return null; // AppBootstrapService/AppLoader handles loading UI
  }
  
  // Route based on auth state determined by AppBootstrapService
  if (sessionStatus === 'authenticated') {
    return <>{children}</>;
  }
  
  // For unauthenticated users, determine UI based on bootstrap result
  return <AuthUnauthenticatedRouter />;
}

/**
 * Router for unauthenticated users
 * Uses explicit flag from Bootstrap instead of parsing errors
 */
function AuthUnauthenticatedRouter() {
  const { flags } = useBootstrapContext();
  const [showRegister, setShowRegister] = React.useState(flags.firstTimeSetupRequired);

  // Bootstrap single source of truth: explicit flag for first-time setup
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
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user',
  };
}
