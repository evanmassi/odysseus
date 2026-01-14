/**
 * Public page for token-based password reset.
 * Token is provided via admin-generated link (no auth required).
 */

import { useRef, useEffect, useState } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { authenticationService } from '@domains/authentication/services/AuthenticationService';
import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

import { CreatePasswordForm } from './CreatePasswordForm';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);

  // Timer ref for cleanup on unmount
  const redirectTimerRef = useRef<number | null>(null);

  // Focus trap for the modal-like card
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
  });

  // Cleanup timer on unmount
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

    await authenticationService.resetPasswordWithToken(token, newPassword);
    setIsSuccess(true);

    // Redirect to login after showing success confirmation
    redirectTimerRef.current = window.setTimeout(() => {
      void navigate('/login');
    }, 2500);
  };

  const handleBackToLogin = () => {
    void navigate('/login');
  };

  // Invalid or missing token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div
          ref={trapRef}
          className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10"
        >
          <div className="text-center mb-4">
            <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
              <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-bold text-red-600">Invalid Reset Link</h2>
          </div>

          <p className="text-gray-700 mb-6 text-center text-sm">
            This password reset link is invalid or has expired. Please contact your administrator
            for a new reset link.
          </p>

          <button
            onClick={handleBackToLogin}
            className="w-full btn btn-primary h-12 text-base font-bold shadow-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Success view after password reset
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div
          ref={trapRef}
          className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10"
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
            </div>

            <div className="flex justify-center mb-4">
              <AnimatedCheckmark size={64} />
            </div>

            <h2 className="text-xl font-bold text-emerald-600 mb-2">Password Changed</h2>
            <p className="text-sm text-text-muted">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div
        ref={trapRef}
        className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10"
      >
        <div className="text-center mb-4">
          <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
            <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Create New Password</h2>
        </div>

        <CreatePasswordForm
          onSubmit={handleSubmit}
          onCancel={handleBackToLogin}
          cancelText="Login"
          submitText="Reset Password"
          loadingText="Resetting Password..."
        />

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-text-muted text-center">
            This reset link expires in 15 minutes and can only be used once.
          </p>
        </div>
      </div>
    </div>
  );
};
