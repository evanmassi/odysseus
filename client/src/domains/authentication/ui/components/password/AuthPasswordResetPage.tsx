/**
 * Public page for token-based password reset.
 * Token is provided via admin-generated link (no auth required).
 */

import { useRef, useEffect, useState, type ReactNode, type RefObject } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { authService } from '@domains/authentication/services/AuthService';
import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { Button } from '@shared/ui';

import { AuthPasswordCreateForm } from './AuthPasswordCreateForm';

// Enough time to read the success message before redirecting
const REDIRECT_DELAY_MS = 2500;

function OdysseusLogo({ className = 'mb-1' }: { className?: string }) {
  return (
    <div className={`w-24 h-24 mx-auto flex items-center justify-center ${className}`}>
      <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
    </div>
  );
}

function PageLayout({
  trapRef,
  children,
}: {
  trapRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div
        ref={trapRef}
        className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10"
      >
        {children}
      </div>
    </div>
  );
}

export function AuthPasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);

  const redirectTimerRef = useRef<number | null>(null);

  // Focus trap for the modal-like card
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
  });

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

  if (!token) {
    return (
      <PageLayout trapRef={trapRef}>
        <div className="text-center mb-4">
          <OdysseusLogo />
          <h2 className="text-xl font-bold text-danger-text">Invalid Reset Link</h2>
        </div>

        <p className="text-secondary-foreground mb-6 text-center text-sm">
          This password reset link is invalid or has expired. Please contact your administrator for
          a new reset link.
        </p>

        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleBackToLogin}
          className="shadow-lg font-bold"
        >
          Back to Login
        </Button>
      </PageLayout>
    );
  }

  if (isSuccess) {
    return (
      <PageLayout trapRef={trapRef}>
        <div className="text-center">
          <OdysseusLogo className="mb-4" />

          <div className="flex justify-center mb-4">
            <AnimatedCheckmark size={64} className="text-success-text" />
          </div>

          <h2 className="text-xl font-bold text-success-text mb-2">Password Changed</h2>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout trapRef={trapRef}>
      <div className="text-center mb-4">
        <OdysseusLogo />
        <h2 className="text-xl font-bold text-card-foreground">Create New Password</h2>
      </div>

      <AuthPasswordCreateForm
        onSubmit={handleSubmit}
        onCancel={handleBackToLogin}
        cancelText="Login"
        submitText="Reset Password"
        loadingText="Resetting Password..."
      />

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          This reset link expires in 15 minutes and can only be used once.
        </p>
      </div>
    </PageLayout>
  );
}
