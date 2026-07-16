/**
 * Login Form
 *
 * Handles login, forced password change, and session expiration banners.
 */

import { useEffect, useState, useRef } from 'react';

import { KeyRound, UserRound, Mail, Clock, TimerOff } from 'lucide-react';

import { useAuthStackTransition } from '@domains/authentication/hooks/useAuthStackTransition';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
import { authService } from '@domains/authentication/services/AuthService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { AlertBanner, AuthInput, AuthLinkButton, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { AuthPasswordCreateForm } from '../password/AuthPasswordCreateForm';

import { AuthPasswordChangedModal } from './AuthPasswordChangedModal';

import type { ShellConfig } from './shellConfigContext';

interface AuthLoginModalProps {
  onSwitchToRegister?: () => void;
}

type LoginState = 'login' | 'forgot' | 'change-required' | 'change-success';

export function AuthLoginModal({ onSwitchToRegister }: AuthLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorPulse, setErrorPulse] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    login,
    forceChangePassword,
    clearPasswordChangeRequired,
    logoutReason,
    passwordChangeRequired,
    passwordChangeSuccess,
  } = useAuthStore();
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  // Bumping the pulse keeps the banner mounted across retries (no remount, no
  // animate-in replay) while still giving the nudge effect something to fire on.
  const flagLoginError = (message: string) => {
    setLoginError(message);
    setErrorPulse(p => p + 1);
  };

  // Pulse > 1 means the banner is already mounted — retrigger the nudge keyframe
  // via inline style so it beats the wrapper's animate-in class (utilities layer
  // outranks our component-layer nudge class, so a class-based override loses).
  // First pulse falls through to the wrapper's animate-in slide-in.
  useEffect(() => {
    if (errorPulse <= 1) return;
    const el = errorBannerRef.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'auth-banner-nudge 320ms cubic-bezier(0.34, 1.2, 0.64, 1)';
  }, [errorPulse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      flagLoginError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.success === true) {
        setLoginError(null);
        notifications.success('Login successful!');
      } else if (result.success === 'password_change_required') {
        setLoginError(null);
        setPassword('');
      } else {
        flagLoginError(result.error || 'Incorrect username or password. Please try again.');
      }
    } catch (error) {
      flagLoginError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    const success = await forceChangePassword(newPassword);

    if (!success) {
      // Read the error the action just set, not a stale render-time binding.
      const storeError = useAuthStore.getState().error;
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error message should fall through to default
      throw new Error(storeError || 'Password change failed. Please try again.');
    }
  };

  const handleCancelPasswordChange = () => {
    clearPasswordChangeRequired();
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

  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check multiple error conditions */
  const isEmailVerificationError =
    loginError?.toLowerCase().includes('email not verified') ||
    loginError?.toLowerCase().includes('verify your email');
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const inputState: LoginState = passwordChangeSuccess
    ? 'change-success'
    : passwordChangeRequired
      ? 'change-required'
      : showForgotPassword
        ? 'forgot'
        : 'login';
  const { state, exitClass } = useAuthStackTransition(inputState);

  useShellConfig(getShellConfig(state, usernameInputRef));

  if (state === 'change-success') {
    return (
      <div key="change-success" className={`animate-auth-stack ${exitClass}`}>
        <AuthPasswordChangedModal status="Logging in…" />
      </div>
    );
  }

  if (state === 'forgot') {
    return (
      <div key="forgot" className={`animate-auth-stack ${exitClass}`}>
        <p className="text-body text-[rgb(var(--auth-text-dim))]">
          Please contact your administrator to reset your password.
        </p>
        <div className="mt-5 text-center">
          <AuthLinkButton
            onClick={() => setShowForgotPassword(false)}
            className="font-mono text-data-sm"
          >
            ← Back to sign in
          </AuthLinkButton>
        </div>
      </div>
    );
  }

  if (state === 'change-required') {
    return (
      <div key="change-required" className={`animate-auth-stack ${exitClass}`}>
        <AuthPasswordCreateForm
          onSubmit={handlePasswordChange}
          onCancel={handleCancelPasswordChange}
          cancelText="Login"
        />
      </div>
    );
  }

  return (
    <div key="login" className={`animate-auth-stack ${exitClass}`}>
      {logoutReason === 'idle_timeout' && (
        <AlertBanner variant="warning" icon={Clock}>
          Session timed out
        </AlertBanner>
      )}

      {logoutReason === 'token_expired' && (
        <AlertBanner variant="warning" icon={TimerOff}>
          Your session has expired. Please sign in again.
        </AlertBanner>
      )}

      {loginError && isEmailVerificationError && (
        <div className="mb-6 p-4 bg-info-light/10 border border-info-border/40 rounded">
          <div className="flex items-start gap-3 mb-3">
            <Mail className="w-5 h-5 text-info-text flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-body font-semibold text-info-text">Email Verification Required</p>
              <p className="text-body-sm text-[rgb(var(--auth-text-dim))] mt-1">{loginError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            tail
            ceremonial
            fullWidth
            onClick={handleResendVerification}
            isLoading={isResending}
            loadingText="Sending..."
          >
            Resend Verification Email
          </Button>
        </div>
      )}

      {loginError && !isEmailVerificationError && (
        <div ref={errorBannerRef} className="mb-4 animate-in slide-in-from-top-2 duration-300">
          <AlertBanner variant="error" animate={false} spacing="none">
            {loginError}
          </AlertBanner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          variant="console"
          required
          disabled={isLoading}
        />

        <div>
          <AuthInput
            id="password"
            type="password"
            value={password}
            onChange={setPassword}
            label="Password"
            placeholder="Your password"
            icon={<KeyRound size={16} />}
            state={loginError ? 'error' : 'default'}
            variant="console"
            required
            disabled={isLoading}
          />
          <div className="text-right mt-0.5">
            <AuthLinkButton
              onClick={() => setShowForgotPassword(true)}
              className="font-mono text-data-sm"
            >
              Forgot password?
            </AuthLinkButton>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          tail
          ceremonial
          fullWidth
          isLoading={isLoading}
          loadingText="Authenticating..."
        >
          Sign In
        </Button>
      </form>

      {onSwitchToRegister && (
        <div className="mt-4 text-center">
          <p className="text-data-sm font-mono text-[rgb(var(--auth-text-mute))]">
            Don&apos;t have an account?{' '}
            <AuthLinkButton onClick={onSwitchToRegister}>Register here</AuthLinkButton>
          </p>
        </div>
      )}
    </div>
  );
}

function getShellConfig(
  state: LoginState,
  usernameInputRef: React.RefObject<HTMLInputElement>
): ShellConfig {
  switch (state) {
    case 'change-success':
      return {
        contentKey: 'login:change-success',
        variant: 'console',
        width: 'narrow',
        showBranding: true,
      };
    case 'forgot':
      return {
        contentKey: 'login:forgot',
        variant: 'console',
        width: 'narrow',
        showBranding: true,
        brandGreeting: 'Reset access',
        microheader: 'Contact administrator',
      };
    case 'change-required':
      return {
        contentKey: 'login:change-required',
        variant: 'console',
        width: 'narrow',
        showBranding: true,
        brandGreeting: 'Choose a new password',
        microheader: 'Password change required',
      };
    case 'login':
    default:
      return {
        contentKey: 'login:login',
        variant: 'console',
        width: 'narrow',
        showBranding: true,
        brandGreeting: 'Welcome back',
        microheader: 'Sign in to continue',
        initialFocusRef: usernameInputRef,
      };
  }
}
