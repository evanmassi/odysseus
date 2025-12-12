import { useState, useRef } from 'react';

import { KeyRound, UserRound, Mail, Eye, EyeOff } from 'lucide-react';

import odysseusLogo from '@shared/assets/odysseus-logo-altered.svg';
import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { notifications } from '@shared/utils';

import { authService } from '../../services/AuthenticationService';
import { useAuthStore } from '../../stores/authStore';

// React Query will automatically fetch researchers when components mount

interface LoginModalProps {
  onSwitchToRegister?: () => void;
}

export function LoginModal({ onSwitchToRegister }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const { login, logoutReason, error: authError } = useAuthStore();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Focus trap with initial focus on username field
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
    initialFocusRef: usernameInputRef,
  });

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
      const success = await login(username, password);

      if (success) {
        notifications.success('Login successful!');

        // Initial data loading is now handled by React Query in components automatically
        // Socket connection is now managed centrally by AppBootstrapService
      } else {
        // Use actual error from auth store for specific error messages
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error message should fall through to default
        setLoginError(authError || 'Incorrect username or password. Please try again.');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  // Check if error is about password change requirement
  const isPasswordChangeRequired = loginError?.toLowerCase().includes('password change required');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 animate-in fade-in duration-150">
      <div
        ref={trapRef}
        className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10 animate-zoom-in-95"
      >
        <div className="text-center mb-4">
          <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
            <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
          </div>
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img src={odysseusLogo} alt="Odysseus" className="h-10 w-auto" />
          </div>
          <p className="text-sm text-slate-400">Welcome back · sign in to continue</p>
        </div>

        {/* Session Timeout Banner */}
        {logoutReason === 'idle_timeout' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800">Session Timed Out</p>
              <p className="text-xs text-yellow-700 mt-1">
                Your session expired due to inactivity. Please log in again.
              </p>
            </div>
          </div>
        )}

        {/* Email Verification Error Banner */}
        {loginError && isEmailVerificationError && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Email Verification Required</p>
                <p className="text-xs text-blue-700 mt-1">{loginError}</p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-action hover:bg-action-hover disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
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

        {/* Password Change Required Banner */}
        {loginError && isPasswordChangeRequired && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">Password Change Required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your password must be changed. Please contact an administrator for a password
                  reset link.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generic Login Error Banner */}
        {loginError && !isEmailVerificationError && !isPasswordChangeRequired && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Login Failed</p>
              <p className="text-xs text-red-700 mt-1">{loginError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email */}
          <div
            className={`auth-input-container ${loginError ? 'input-field-error' : 'border-slate-200'}`}
          >
            <label
              htmlFor="username"
              className={`absolute -top-2 left-3 bg-odysseus-surface px-1 text-[10px] font-medium ${loginError ? 'text-validation-error-label' : 'text-slate-400'}`}
            >
              Username or email
            </label>
            <div className="relative px-3 py-2">
              <UserRound
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${loginError ? 'text-validation-error-icon' : 'text-odysseus-muted'}`}
                size={16}
              />
              <input
                ref={usernameInputRef}
                type="text"
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45 ${loginError ? 'text-validation-error-text' : ''}`}
                placeholder="Your username or email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div
            className={`auth-input-container ${loginError ? 'input-field-error' : 'border-slate-200'}`}
          >
            <label
              htmlFor="password"
              className={`absolute -top-2 left-3 bg-odysseus-surface px-1 text-[10px] font-medium ${loginError ? 'text-validation-error-label' : 'text-slate-400'}`}
            >
              Password
            </label>
            <div className="relative px-3 py-2">
              <KeyRound
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${loginError ? 'text-validation-error-icon' : 'text-odysseus-muted'}`}
                size={16}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`pl-7 pr-8 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45 ${loginError ? 'text-validation-error-text' : ''}`}
                placeholder="Your password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 rounded focus-enhanced"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary h-12 text-base font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="spinner w-5 h-5"></div>
                <span>Authenticating...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-4 text-center">
            <p className="text-xs text-odysseus-muted">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-action-hover font-semibold hover:text-[#3d6a99] transition-colors focus-enhanced rounded px-1"
              >
                Register here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
