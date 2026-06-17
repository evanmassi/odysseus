/**
 * Password & Session Security
 *
 * Password management and active session controls for authenticated users.
 */
import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound, Save } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { PasswordRequirements } from '@domains/authentication/ui/components/password/PasswordRequirements';
import { usePasswordChange } from '@domains/users/hooks/usePasswordChange';
import { logger } from '@infra/logger';
import { AlertBanner, AuthInput, Button, ConsolePanel, Subsection } from '@shared/ui';
import { notifications } from '@shared/utils';

import { SessionListPanel } from '../SessionListPanel';

import type { PasswordRequirements as PasswordConfig } from '@domains/authentication/services/AuthService';

export function SecurityTab() {
  const user = useAuthStore(state => state.user);
  const isDemo = user?.isDemo ?? false;
  const { changePassword, isChanging, reset } = usePasswordChange();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  const [passwordRequirements, setPasswordRequirements] = useState<PasswordConfig | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isDemo) return;

    const fetchRequirements = async () => {
      try {
        const requirements = await authService.getPasswordRequirements();
        setPasswordRequirements(requirements);
      } catch (error) {
        logger.error('Failed to fetch password requirements', { error });
      }
    };
    void fetchRequirements();
  }, [isDemo]);

  // Convert touched/valid to AuthInput validation state
  const getValidationState = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'default' as const;
    return isValid ? ('success' as const) : ('error' as const);
  };

  const newPasswordMeetsRequirements = useMemo(() => {
    if (!passwordRequirements || !newPassword) return false;
    const result = PasswordValidator.validate(newPassword, passwordRequirements);
    return result.isValid;
  }, [newPassword, passwordRequirements]);

  const passwordsMatch = useMemo(() => {
    return newPassword === confirmPassword && confirmPassword.length > 0;
  }, [newPassword, confirmPassword]);

  const newPasswordIsDifferent = useMemo(() => {
    return currentPassword !== newPassword || newPassword.length === 0;
  }, [currentPassword, newPassword]);

  const isFormValid = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPasswordMeetsRequirements &&
      passwordsMatch &&
      newPasswordIsDifferent
    );
  }, [currentPassword, newPasswordMeetsRequirements, passwordsMatch, newPasswordIsDifferent]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      if (currentPassword.trim().length === 0) {
        setCurrentPasswordError('Current password is required');
        return;
      }
      if (!newPasswordMeetsRequirements) {
        setNewPasswordTouched(true);
        notifications.error('New password does not meet requirements');
        return;
      }
      if (!passwordsMatch) {
        setConfirmPasswordTouched(true);
        notifications.error('Passwords do not match');
        return;
      }
      if (!newPasswordIsDifferent) {
        setNewPasswordTouched(true);
        notifications.error('New password must be different from current password');
        return;
      }
      return;
    }

    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          notifications.success('Password changed successfully');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setNewPasswordTouched(false);
          setConfirmPasswordTouched(false);
          setCurrentPasswordError(null);
          setShowSuccess(true);
          reset();
        },
        onError: (error: Error) => {
          logger.error('SecurityTab password change failed', { error });
          if (
            error.message.toLowerCase().includes('incorrect') ||
            error.message.toLowerCase().includes('invalid')
          ) {
            setCurrentPasswordError('Current password is incorrect');
          }
          notifications.error(error.message || 'Failed to change password');
        },
      }
    );
  };

  return (
    <ConsolePanel intensity="soft">
      <Subsection title="Password" index={1} accent>
        <div className="col-span-2 space-y-4 py-4">
          {isDemo && (
            <AlertBanner variant="demo" spacing="sm">
              Account changes are not available in demo mode
            </AlertBanner>
          )}

          <div className="space-y-1">
            <AuthInput
              id="security-currentPassword"
              type="password"
              value={currentPassword}
              onChange={value => {
                setCurrentPassword(value);
                setShowSuccess(false);
                if (currentPasswordError) {
                  setCurrentPasswordError(null);
                }
              }}
              label="Current Password"
              placeholder="Enter current password"
              icon={<KeyRound size={16} />}
              state={currentPasswordError ? 'error' : 'default'}
              variant="console"
              required
              disabled={isChanging || isDemo}
            />
            {currentPasswordError && (
              <p className="text-[10px] text-danger-text ml-1">{currentPasswordError}</p>
            )}
          </div>

          <div className="space-y-1">
            <AuthInput
              id="security-newPassword"
              type="password"
              value={newPassword}
              onChange={value => {
                setNewPassword(value);
                setShowSuccess(false);
              }}
              onBlur={() => setNewPasswordTouched(true)}
              label="New Password"
              placeholder="Enter new password"
              icon={<KeyRound size={16} />}
              state={getValidationState(
                newPasswordTouched,
                newPasswordMeetsRequirements && newPasswordIsDifferent
              )}
              variant="console"
              required
              disabled={isChanging || isDemo}
            />
            {passwordRequirements && !isDemo && (
              <PasswordRequirements
                password={newPassword}
                config={passwordRequirements}
                showError={newPasswordTouched && !newPasswordMeetsRequirements}
              />
            )}
            {!newPasswordIsDifferent && newPasswordTouched && (
              <p className="text-[10px] text-danger-text ml-1">
                New password must be different from current password
              </p>
            )}
          </div>

          <div className="space-y-1">
            <AuthInput
              id="security-confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={value => {
                setConfirmPassword(value);
                setShowSuccess(false);
              }}
              onBlur={() => setConfirmPasswordTouched(true)}
              label="Confirm Password"
              placeholder="Confirm new password"
              icon={<KeyRound size={16} />}
              state={getValidationState(confirmPasswordTouched, passwordsMatch)}
              variant="console"
              required
              disabled={isChanging || isDemo}
            />
            {confirmPasswordTouched && !passwordsMatch && confirmPassword.length > 0 && !isDemo && (
              <p className="text-[10px] text-danger-text ml-1">Passwords do not match</p>
            )}
          </div>
        </div>
      </Subsection>

      <div className="flex items-center gap-4 border-t border-line-soft bg-black/25 [background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
        {showSuccess && (
          <AlertBanner variant="success" spacing="none">
            Password changed successfully
          </AlertBanner>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!isFormValid || isDemo}
          isLoading={isChanging}
          loadingText="Changing Password..."
          leftIcon={<Save size={14} />}
          className="ml-auto"
        >
          Change Password
        </Button>
      </div>

      <Subsection title="Active Sessions" index={2} accent>
        <div className="col-span-2 space-y-3 py-4">
          <p className="text-xs text-secondary-foreground">
            Manage your active sessions across all devices. You can revoke access from any device.
          </p>
          <SessionListPanel />
        </div>
      </Subsection>
    </ConsolePanel>
  );
}
