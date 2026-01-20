/**
 * Reusable password creation form with real-time validation.
 * Used by LoginModal (force change) and ResetPasswordPage (token reset).
 */

import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound } from 'lucide-react';

import {
  authService,
  type PasswordRequirements as PasswordConfig,
} from '@domains/authentication/services/AuthenticationService';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, AuthInput, Button } from '@shared/ui';

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

  // Validation state for new password
  const newPasswordValidationState = useMemo(() => {
    if (!newPassword) return 'default' as const;
    if (passwordMeetsRequirements) return 'success' as const;
    if (newPasswordTouched) return 'error' as const;
    return 'default' as const;
  }, [newPassword, passwordMeetsRequirements, newPasswordTouched]);

  // Validation state for confirm password
  const confirmPasswordValidationState = useMemo(() => {
    if (!confirmPassword) return 'default' as const;
    if (passwordsMatch && passwordMeetsRequirements) return 'success' as const;
    if (confirmPassword.length > 0 && !passwordsMatch) return 'error' as const;
    return 'default' as const;
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
      {displayError && <AlertBanner variant="error">{displayError}</AlertBanner>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <AuthInput
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={handlePasswordChange}
          onBlur={() => setNewPasswordTouched(true)}
          label="New Password"
          placeholder="Enter new password"
          icon={<KeyRound size={16} />}
          state={newPasswordValidationState}
          required
          disabled={isLoading}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX: focus first input when form appears
          autoFocus
        />

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
        <AuthInput
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmChange}
          label="Confirm Password"
          placeholder="Confirm new password"
          icon={<KeyRound size={16} />}
          state={confirmPasswordValidationState}
          required
          disabled={isLoading}
        />

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
