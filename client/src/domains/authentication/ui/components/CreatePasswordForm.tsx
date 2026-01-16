/**
 * Reusable password creation form with real-time validation.
 * Used by LoginModal (force change) and ResetPasswordPage (token reset).
 */

import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';

import {
  authService,
  type PasswordRequirements as PasswordConfig,
} from '@domains/authentication/services/AuthenticationService';
import { logger } from '@shared/infrastructure/logger';
import { Button } from '@shared/ui';

import { PasswordRequirements } from './PasswordRequirements';

export interface CreatePasswordFormProps {
  /** Called when form is submitted with valid password */
  onSubmit: (newPassword: string) => Promise<void>;
  /** Optional cancel/back action */
  onCancel?: () => void;
  /** Text for cancel link (default: "Login") */
  cancelText?: string;
  /** Text for submit button (default: "Set New Password") */
  submitText?: string;
  /** Loading text for submit button (default: "Changing Password...") */
  loadingText?: string;
  /** External error message to display */
  error?: string | null;
  /** Clear external error when user starts typing */
  onErrorClear?: () => void;
}

export function CreatePasswordForm({
  onSubmit,
  onCancel,
  cancelText = 'Login',
  submitText = 'Set New Password',
  loadingText = 'Changing Password...',
  error: externalError,
  onErrorClear,
}: CreatePasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig | null>(null);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const requirements = await authService.getPasswordRequirements();
        setPasswordConfig(requirements);
      } catch (err) {
        logger.error('Failed to load password requirements', { error: err });
      }
    })();
  }, []);

  const passwordMeetsRequirements = useMemo(() => {
    if (!passwordConfig || !newPassword) return false;
    return PasswordValidator.validate(newPassword, passwordConfig).isValid;
  }, [newPassword, passwordConfig]);

  const passwordsMatch = useMemo(() => {
    return confirmPassword.length > 0 && newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const newPasswordBorderClass = useMemo(() => {
    if (!newPassword) return 'border-border';
    if (passwordMeetsRequirements) return 'border-success-border';
    if (newPasswordTouched) return 'input-field-error';
    return 'border-border';
  }, [newPassword, passwordMeetsRequirements, newPasswordTouched]);

  const confirmPasswordBorderClass = useMemo(() => {
    if (!confirmPassword) return 'border-border';
    if (passwordsMatch && passwordMeetsRequirements) return 'border-success-border';
    if (confirmPassword.length > 0 && !passwordsMatch) return 'input-field-error';
    return 'border-border';
  }, [confirmPassword, passwordsMatch, passwordMeetsRequirements]);

  // Combined error (internal takes precedence, then external)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string error should fall through
  const displayError = internalError || externalError;

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setInternalError(null);
    onErrorClear?.();
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    setInternalError(null);
    onErrorClear?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError(null);

    if (!passwordMeetsRequirements) {
      setNewPasswordTouched(true);
      setInternalError('Password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setInternalError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordTouched(false);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Error message could be empty string
      const message =
        (err instanceof Error && err.message) || 'Password change failed. Please try again.';
      setInternalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Error Banner */}
      {displayError && (
        <div className="mb-4 px-3 py-2 bg-danger-light border-l-4 border-l-danger-border rounded-lg shadow-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-4 h-4 text-danger-text flex-shrink-0" />
          <span className="text-sm text-danger-text">{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className={`auth-input-container ${newPasswordBorderClass}`}>
          <label
            htmlFor="newPassword"
            className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-medium ${passwordMeetsRequirements ? 'text-success-text' : newPasswordTouched && !passwordMeetsRequirements ? 'text-validation-error-label' : 'text-muted-foreground'}`}
          >
            New Password
          </label>
          <div className="relative px-3 py-2">
            <KeyRound
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${passwordMeetsRequirements ? 'text-success-text' : newPasswordTouched && !passwordMeetsRequirements ? 'text-validation-error-icon' : 'text-muted-foreground'}`}
              size={16}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              id="newPassword"
              value={newPassword}
              onChange={e => handlePasswordChange(e.target.value)}
              onBlur={() => setNewPasswordTouched(true)}
              className="pl-7 pr-8 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
              placeholder="Enter new password"
              required
              disabled={isLoading}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX: focus first input when form appears
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground rounded focus-enhanced"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        {passwordConfig && (
          <PasswordRequirements
            password={newPassword}
            config={passwordConfig}
            showError={newPasswordTouched && !passwordMeetsRequirements}
            className="ml-2 !mt-0"
          />
        )}

        {/* Confirm Password */}
        <div className={`auth-input-container ${confirmPasswordBorderClass}`}>
          <label
            htmlFor="confirmPassword"
            className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-medium ${passwordsMatch && passwordMeetsRequirements ? 'text-success-text' : confirmPassword.length > 0 && !passwordsMatch ? 'text-validation-error-label' : 'text-muted-foreground'}`}
          >
            Confirm Password
          </label>
          <div className="relative px-3 py-2">
            <KeyRound
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${passwordsMatch && passwordMeetsRequirements ? 'text-success-text' : confirmPassword.length > 0 && !passwordsMatch ? 'text-validation-error-icon' : 'text-muted-foreground'}`}
              size={16}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={e => handleConfirmChange(e.target.value)}
              className="pl-7 pr-8 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
              placeholder="Confirm new password"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="xl"
          fullWidth
          isLoading={isLoading}
          loadingText={loadingText}
          className="shadow-lg font-bold"
        >
          {submitText}
        </Button>
      </form>

      {onCancel && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Return to{' '}
            <button
              type="button"
              onClick={onCancel}
              className="text-action-hover font-semibold hover:text-action transition-colors focus-enhanced rounded px-1"
              disabled={isLoading}
            >
              {cancelText}
            </button>
          </p>
        </div>
      )}
    </>
  );
}
