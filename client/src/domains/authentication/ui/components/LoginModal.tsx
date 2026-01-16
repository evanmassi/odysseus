/**
 * LoginModal - Primary authentication entry point
 *
 * Handles three states: login form, forced password change, and success confirmation.
 * Supports session expiration banners and email verification flows.
 */

import { useState, useRef } from 'react';

import { KeyRound, UserRound, Mail, Clock, AlertTriangle, TimerOff } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';
import { AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { AuthBaseModal } from './AuthBaseModal';
import { CreatePasswordForm } from './CreatePasswordForm';

interface LoginModalProps {
  onSwitchToRegister?: () => void;
}

export function LoginModal({ onSwitchToRegister }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const {
    login,
    forceChangePassword,
    clearPasswordChangeRequired,
    logoutReason,
    error: authError, // Still used for forceChangePassword error display
    passwordChangeRequired,
    passwordChangeSuccess,
  } = useAuthStore();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous error on new attempt
    setLoginError(null);

    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success === true) {
        notifications.success('Login successful!');
      } else if (result.success === 'password_change_required') {
        // Password change form will be shown automatically via passwordChangeRequired state
        setPassword('');
      } else {
        // Error message comes directly from the login result
        setLoginError(result.error || 'Incorrect username or password. Please try again.');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    const success = await forceChangePassword(newPassword);

    if (!success) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error message should fall through to default
      throw new Error(authError || 'Password change failed. Please try again.');
    }
    // Success state and delay are handled in the auth store
  };

  const handleCancelPasswordChange = () => {
    clearPasswordChangeRequired();
    setPasswordError(null);
  };

  const handleResendVerification = async () => {
    if (!username.trim()) {
      notifications.error('Please enter your username or email first');
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerificationEmail(username);
      notifications.success('Verification email sent! Check your inbox.');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to resend verification email';
      notifications.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Check if error is about email verification
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check multiple error conditions */
  const isEmailVerificationError =
    loginError?.toLowerCase().includes('email not verified') ||
    loginError?.toLowerCase().includes('verify your email');
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  // Show success confirmation after password change (before full login completes)
  if (passwordChangeSuccess) {
    return (
      <AuthBaseModal key="password-success" showBranding="icon">
        <div className="flex justify-center mb-4">
          <AnimatedCheckmark size={64} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-success-text mb-2">Password Changed</h2>
          <p className="text-sm text-muted-foreground">Logging in...</p>
        </div>
      </AuthBaseModal>
    );
  }

  // Show password change form when required
  if (passwordChangeRequired) {
    return (
      <AuthBaseModal key="password-change" showBranding="icon">
        <h2 className="text-xl font-bold text-card-foreground text-center mb-4">
          Create New Password
        </h2>

        <CreatePasswordForm
          onSubmit={handlePasswordChange}
          onCancel={handleCancelPasswordChange}
          cancelText="Login"
          error={passwordError}
          onErrorClear={() => setPasswordError(null)}
        />
      </AuthBaseModal>
    );
  }

  return (
    <AuthBaseModal
      key="login"
      subtitle="Welcome back · sign in to continue"
      initialFocusRef={usernameInputRef}
    >
      {/* Session Expiration Banners */}
      {logoutReason === 'idle_timeout' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning-light border-l-4 border-l-warning-border rounded-lg shadow-sm mb-4 animate-in slide-in-from-top-2 duration-300">
          <Clock className="w-4 h-4 text-warning-text flex-shrink-0" />
          <span className="text-sm text-warning-text">Session timed out due to inactivity</span>
        </div>
      )}

      {logoutReason === 'token_expired' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning-light border-l-4 border-l-warning-border rounded-lg shadow-sm mb-4 animate-in slide-in-from-top-2 duration-300">
          <TimerOff className="w-4 h-4 text-warning-text flex-shrink-0" />
          <span className="text-sm text-warning-text">
            Your session has expired. Please sign in again.
          </span>
        </div>
      )}

      {/* Email Verification Error Banner */}
      {loginError && isEmailVerificationError && (
        <div className="mb-6 p-4 bg-info-light border border-info-border rounded-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 mb-3">
            <Mail className="w-5 h-5 text-info-text flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-info-bg">Email Verification Required</p>
              <p className="text-xs text-info-text mt-1">{loginError}</p>
            </div>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-action hover:bg-action-hover disabled:bg-muted-foreground text-white text-sm font-medium rounded-lg transition-colors"
            type="button"
          >
            {isResending ? (
              <>
                <div className="spinner w-4 h-4 border-white border-t-transparent"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Resend Verification Email</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Generic Login Error Banner */}
      {loginError && !isEmailVerificationError && (
        <div className="mb-4 px-3 py-2 bg-danger-light border-l-4 border-l-danger-border rounded-lg shadow-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-4 h-4 text-danger-text flex-shrink-0" />
          <span className="text-sm text-danger-text">{loginError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username or Email */}
        <AuthInput
          ref={usernameInputRef}
          id="username"
          type="text"
          value={username}
          onChange={setUsername}
          label="Username or email"
          placeholder="Your username or email"
          icon={<UserRound size={16} />}
          state={loginError ? 'error' : 'default'}
          required
          disabled={isLoading}
        />

        {/* Password */}
        <AuthInput
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          label="Password"
          placeholder="Your password"
          icon={<KeyRound size={16} />}
          state={loginError ? 'error' : 'default'}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="xl"
          fullWidth
          isLoading={isLoading}
          loadingText="Authenticating..."
          className="shadow-lg font-bold"
        >
          Sign In
        </Button>
      </form>

      {onSwitchToRegister && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-action-hover font-semibold hover:text-action transition-colors focus-enhanced rounded px-1"
            >
              Register here
            </button>
          </p>
        </div>
      )}
    </AuthBaseModal>
  );
}
