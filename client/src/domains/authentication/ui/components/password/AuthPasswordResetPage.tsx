/**
 * Password Reset Page
 *
 * Public token-based password reset. Token arrives via admin-generated email link.
 */

import { useRef, useEffect, useState } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { useDelayedTransition } from '@domains/authentication/hooks/useDelayedTransition';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
import { authService } from '@domains/authentication/services/AuthService';
import { AuthGatewayPanel } from '@domains/authentication/ui/components/gateway/AuthGatewayPanel';
import { Button } from '@shared/ui';
import { AnimatedCheckmark } from '@shared/ui/components/icons/AnimatedCheckmark';

import { AuthPasswordCreateForm } from './AuthPasswordCreateForm';

import type { ShellConfig } from '@domains/authentication/ui/components/gateway/shellConfigContext';

// Enough time to read the success message before redirecting
const REDIRECT_DELAY_MS = 2500;

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
  const { displayed: state, isTransitioning } = useDelayedTransition(inputState, 200);
  const exitClass = isTransitioning ? 'animate-auth-stack-exit' : '';

  useShellConfig(getShellConfig(state));

  if (state === 'invalid') {
    return (
      <div key="reset-invalid" className={`animate-auth-stack ${exitClass}`}>
        <div className="text-center mb-4">
          <h2 className="font-mono text-base text-danger-text phosphor-text">Invalid Reset Link</h2>
        </div>
        <p className="font-mono text-sm text-[rgb(var(--auth-text-dim))] mb-6 text-center">
          This password reset link is invalid or has expired. Please contact your administrator for
          a new reset link.
        </p>
        <Button
          variant="primary"
          marker="bar"
          tail
          ceremonial
          fullWidth
          onClick={handleBackToLogin}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div key="reset-success" className={`animate-auth-stack ${exitClass}`}>
        <div className="flex flex-col items-center gap-3">
          <AnimatedCheckmark size={64} className="text-success-text" />
          <h2 className="font-mono text-base text-success-text phosphor-text">Password Changed</h2>
          <p className="font-mono text-xs text-[rgb(var(--auth-text-mute))]">
            Redirecting to login...
          </p>
        </div>
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
      />
      <div className="mt-6 pt-4 border-t border-[rgb(var(--auth-divider))]">
        <p className="font-mono text-[10px] text-[rgb(var(--auth-text-faint))] text-center">
          This reset link expires in 15 minutes and can only be used once.
        </p>
      </div>
    </div>
  );
}

function getShellConfig(state: ResetState): ShellConfig {
  if (state === 'invalid') {
    return {
      contentKey: 'reset:invalid',
      variant: 'stack',
      width: 'narrow',
      showBranding: 'icon',
    };
  }
  if (state === 'success') {
    return {
      contentKey: 'reset:success',
      variant: 'stack',
      width: 'narrow',
      showBranding: 'icon',
    };
  }
  return {
    contentKey: 'reset:form',
    variant: 'stack',
    width: 'narrow',
    showBranding: 'icon',
    brandTagline: 'Create new password',
    microheader: 'New Password',
  };
}
