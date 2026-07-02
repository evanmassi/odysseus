/**
 * Password Reset Page
 *
 * Public token-based password reset. Token arrives via admin-generated email link.
 */

import { useRef, useEffect, useState } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { useAuthStackTransition } from '@domains/authentication/hooks/useAuthStackTransition';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
import { authService } from '@domains/authentication/services/AuthService';
import { AuthGatewayPanel } from '@domains/authentication/ui/components/gateway/AuthGatewayPanel';
import { AuthPasswordChangedModal } from '@domains/authentication/ui/components/gateway/AuthPasswordChangedModal';
import { AlertBanner, Button } from '@shared/ui';

import { AuthPasswordCreateForm } from './AuthPasswordCreateForm';

import type { ShellConfig } from '@domains/authentication/ui/components/gateway/shellConfigContext';

// Enough time to read the success message before redirecting
const REDIRECT_DELAY_MS = 2500;

const DANGER_KEYWORD_CLASS = 'text-danger-bg phosphor-text';

type ResetState = 'invalid' | 'success' | 'form';

export function AuthPasswordResetPage() {
  return (
    <AuthGatewayPanel>
      <ResetContent />
    </AuthGatewayPanel>
  );
}

function ResetContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);

  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (newPassword: string) => {
    if (!token) {
      throw new Error('Invalid reset token');
    }

    await authService.resetPasswordWithToken(token, newPassword);
    setIsSuccess(true);

    redirectTimerRef.current = window.setTimeout(() => {
      void navigate('/login');
    }, REDIRECT_DELAY_MS);
  };

  const handleBackToLogin = () => {
    void navigate('/login');
  };

  const inputState: ResetState = !token ? 'invalid' : isSuccess ? 'success' : 'form';
  const { state, exitClass } = useAuthStackTransition(inputState);

  useShellConfig(getShellConfig(state));

  if (state === 'invalid') {
    return (
      <div key="reset-invalid" className={`animate-auth-stack ${exitClass}`}>
        <AlertBanner variant="error" spacing="lg">
          Reset link is <span className={DANGER_KEYWORD_CLASS}>invalid</span> or{' '}
          <span className={DANGER_KEYWORD_CLASS}>expired</span>. Contact your admin for a new one.
        </AlertBanner>

        <Button variant="primary" tail ceremonial fullWidth onClick={handleBackToLogin}>
          Back to Login
        </Button>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div key="reset-success" className={`animate-auth-stack ${exitClass}`}>
        <AuthPasswordChangedModal status="Redirecting…" />
      </div>
    );
  }

  return (
    <div key="reset-form" className={`animate-auth-stack ${exitClass}`}>
      <AuthPasswordCreateForm
        onSubmit={handleSubmit}
        onCancel={handleBackToLogin}
        cancelText="Login"
        submitText="Reset Password"
        loadingText="Resetting Password..."
        notice={
          <AlertBanner variant="info" spacing="none">
            Expires in 15 minutes · single&nbsp;use
          </AlertBanner>
        }
      />
    </div>
  );
}

function getShellConfig(state: ResetState): ShellConfig {
  if (state === 'invalid') {
    return {
      contentKey: 'reset:invalid',
      variant: 'console',
      width: 'narrow',
      showBranding: true,
    };
  }
  if (state === 'success') {
    return {
      contentKey: 'reset:success',
      variant: 'console',
      width: 'narrow',
      showBranding: true,
    };
  }
  return {
    contentKey: 'reset:form',
    variant: 'console',
    width: 'narrow',
    showBranding: true,
    brandGreeting: 'Choose a new password',
    microheader: 'Account recovery',
  };
}
