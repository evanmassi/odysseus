/**
 * Email Verification Landing Page
 *
 * Reads token from URL, verifies via backend, then redirects to login. Renders
 * inside the gateway console so it shares the lit field and chrome.
 */

import { useEffect, useState, useRef } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { useDelayedTransition } from '@domains/authentication/hooks/useDelayedTransition';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
import { authService } from '@domains/authentication/services/AuthService';
import { AlertBanner, Button, LoadingSpinner } from '@shared/ui';

import { AuthGatewayPanel } from './AuthGatewayPanel';

import type { ShellConfig } from './shellConfigContext';

// Enough time to read the confirmation before redirecting to the login console.
const REDIRECT_DELAY_MS = 3000;

type VerifyState = 'verifying' | 'success' | 'error';

export function AuthEmailVerificationPage() {
  return (
    <AuthGatewayPanel>
      <VerifyContent />
    </AuthGatewayPanel>
  );
}

function VerifyContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyState>('verifying');
  const [error, setError] = useState('');

  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('Verification link is missing its token.');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
        redirectTimerRef.current = window.setTimeout(() => {
          void navigate('/');
        }, REDIRECT_DELAY_MS);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    };

    void verifyEmail();

    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [searchParams, navigate]);

  const handleBackToLogin = () => {
    void navigate('/');
  };

  const { displayed: state, isTransitioning } = useDelayedTransition(status, 200);
  const exitClass = isTransitioning ? 'animate-auth-stack-exit' : '';

  useShellConfig(getShellConfig(state));

  if (state === 'verifying') {
    return (
      <div key="verify-verifying" className={`animate-auth-stack ${exitClass}`}>
        <div className="flex flex-col items-center gap-4 py-2">
          <LoadingSpinner size="lg" className="text-[rgb(var(--auth-text))]" />
          <p className="text-body-sm text-[rgb(var(--auth-text-dim))]">Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div key="verify-success" className={`animate-auth-stack ${exitClass}`}>
        <AlertBanner variant="success" spacing="md">
          Email verified
        </AlertBanner>

        <div className="auth-microheader mb-6">
          <span className="auth-microheader-bar" />
          <span className="phosphor-text">[ Redirecting… ]</span>
          <span className="auth-microheader-rule" />
        </div>

        <Button variant="primary" tail ceremonial fullWidth onClick={handleBackToLogin}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div key="verify-error" className={`animate-auth-stack ${exitClass}`}>
      <AlertBanner variant="error" spacing="md">
        {error}
      </AlertBanner>

      <p className="mb-6 font-mono text-data-sm text-[rgb(var(--auth-text-mute))]">
        Links expire after 48 hours and can only be used once.
      </p>

      <Button variant="primary" tail ceremonial fullWidth onClick={handleBackToLogin}>
        Back to Login
      </Button>
    </div>
  );
}

function getShellConfig(state: VerifyState): ShellConfig {
  if (state === 'success') {
    return {
      contentKey: 'verify:success',
      variant: 'console',
      width: 'narrow',
      showBranding: true,
    };
  }
  if (state === 'error') {
    return {
      contentKey: 'verify:error',
      variant: 'console',
      width: 'narrow',
      showBranding: true,
      microheader: 'Verification failed',
    };
  }
  return {
    contentKey: 'verify:verifying',
    variant: 'console',
    width: 'narrow',
    showBranding: true,
    brandGreeting: 'Confirming your email',
    microheader: 'Email verification',
  };
}
