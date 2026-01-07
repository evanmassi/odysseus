import { useState, useRef } from 'react';

import { KeyRound, UserRound, Mail, Eye, EyeOff, Clock, AlertTriangle } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import odysseusLogo from '@shared/assets/odysseus-logo-thick-altered.svg';
import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';
import { notifications } from '@shared/utils';

import { CreatePasswordForm } from './CreatePasswordForm';

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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const {
    login,
    forceChangePassword,
    clearPasswordChangeRequired,
    logoutReason,
    error: authError,
    passwordChangeRequired,
    passwordChangeSuccess,
  } = useAuthStore();
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
      const result = await login(username, password);

      if (result === true) {
        notifications.success('Login successful!');

        // Initial data loading is now handled by React Query in components automatically
        // Socket connection is now managed centrally by AppBootstrapService
      } else if (result === 'password_change_required') {
        // Password change form will be shown automatically via passwordChangeRequired state
        // Clear the password field for security
        setPassword('');
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
      <ModalPortal>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div
            ref={trapRef}
            className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10 animate-zoom-in-95"
          >
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
              </div>

              <div className="flex justify-center mb-4">
                <AnimatedCheckmark size={64} />
              </div>

              <h2 className="text-xl font-bold text-green-600 mb-2">Password Changed</h2>
              <p className="text-sm text-odysseus-muted">Logging in...</p>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  // Show password change form when required
  if (passwordChangeRequired) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div
            ref={trapRef}
            className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-black/10 animate-zoom-in-95"
          >
            <div className="text-center mb-4">
              <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
                <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Create New Password</h2>
            </div>

            <CreatePasswordForm
              onSubmit={handlePasswordChange}
              onCancel={handleCancelPasswordChange}
              cancelText="Login"
              error={passwordError}
              onErrorClear={() => setPasswordError(null)}
            />
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal>
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
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-l-4 border-l-amber-500 rounded-lg shadow-sm mb-4 animate-in slide-in-from-top-2 duration-300">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700">Session timed out due to inactivity</span>
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

          {/* Generic Login Error Banner */}
          {loginError && !isEmailVerificationError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border-l-4 border-l-red-500 rounded-lg shadow-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{loginError}</span>
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
    </ModalPortal>
  );
}
