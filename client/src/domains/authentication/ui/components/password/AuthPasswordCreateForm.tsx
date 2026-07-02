/**
 * Password Creation Form
 *
 * New-password entry with live requirement validation, shared by the force-change
 * (AuthLoginModal) and token-reset (AuthPasswordResetPage) flows.
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react';

import {
  PasswordValidator,
  type PasswordRequirementsResponse as PasswordConfig,
} from '@odysseus/shared-schemas';
import { KeyRound } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthService';
import { logger } from '@infra/logger';
import { AlertBanner, AuthInput, Button } from '@shared/ui';

import { PasswordRequirements } from './PasswordRequirements';

interface AuthPasswordCreateFormProps {
  onSubmit: (newPassword: string) => Promise<void>;
  onCancel?: () => void;
  cancelText?: string;
  submitText?: string;
  loadingText?: string;
  error?: string | null;
  onErrorClear?: () => void;
  /** Optional banner rendered just above the submit button (e.g. a token expiry notice). */
  notice?: ReactNode;
}

export function AuthPasswordCreateForm({
  onSubmit,
  onCancel,
  cancelText = 'Login',
  submitText = 'Set New Password',
  loadingText = 'Changing Password...',
  error: externalError,
  onErrorClear,
  notice,
}: AuthPasswordCreateFormProps) {
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

  const newPasswordValidationState = useMemo(() => {
    if (!newPassword) return 'default' as const;
    if (passwordMeetsRequirements) return 'success' as const;
    if (newPasswordTouched) return 'error' as const;
    return 'default' as const;
  }, [newPassword, passwordMeetsRequirements, newPasswordTouched]);

  const confirmPasswordValidationState = useMemo(() => {
    if (!confirmPassword) return 'default' as const;
    if (passwordsMatch && passwordMeetsRequirements) return 'success' as const;
    if (!passwordsMatch) return 'error' as const;
    return 'default' as const;
  }, [confirmPassword, passwordsMatch, passwordMeetsRequirements]);

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
      {displayError && <AlertBanner variant="error">{displayError}</AlertBanner>}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          variant="console"
          required
          disabled={isLoading}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX: focus first input when form appears
          autoFocus
        />

        {passwordConfig && (
          <PasswordRequirements
            password={newPassword}
            config={passwordConfig}
            showError={newPasswordTouched && !passwordMeetsRequirements}
            variant="console"
            className="ml-2 !mt-0"
          />
        )}

        <AuthInput
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmChange}
          label="Confirm Password"
          placeholder="Confirm new password"
          icon={<KeyRound size={16} />}
          state={confirmPasswordValidationState}
          variant="console"
          required
          disabled={isLoading}
        />

        {notice}

        <Button
          type="submit"
          variant="primary"
          tail
          ceremonial
          fullWidth
          isLoading={isLoading}
          loadingText={loadingText}
        >
          {submitText}
        </Button>
      </form>

      {onCancel && (
        <div className="mt-4 text-center">
          <p className="text-data-sm font-mono text-[rgb(var(--auth-text-mute))]">
            Return to{' '}
            <button
              type="button"
              onClick={onCancel}
              className="text-[rgb(var(--auth-ambient))] hover:opacity-80 transition-opacity rounded px-1"
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
