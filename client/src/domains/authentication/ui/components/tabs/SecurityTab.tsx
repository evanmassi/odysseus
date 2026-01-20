/**
 * Security Tab
 *
 * Password management for authenticated users.
 * Requires current password verification for security.
 */
import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound, Save, Shield, MonitorSmartphone } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useChangePassword } from '@domains/users/hooks/useChangePassword';
import { AnimatedCheckmark } from '@shared/components';
import { logger } from '@shared/infrastructure/logger';
import { AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { PasswordRequirements } from '../PasswordRequirements';

import { SessionListSection } from './SessionListSection';

import type { PasswordRequirements as PasswordConfig } from '@domains/authentication/services/AuthenticationService';

interface SecurityTabProps {
  onSaveComplete?: () => void;
}

export function SecurityTab({ onSaveComplete }: SecurityTabProps) {
  const { changePassword, isChanging, reset } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [_currentPasswordTouched, setCurrentPasswordTouched] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);

  const [passwordRequirements, setPasswordRequirements] = useState<PasswordConfig | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const requirements = await authService.getPasswordRequirements();
        setPasswordRequirements(requirements);
      } catch (error) {
        logger.error('Failed to fetch password requirements', { error });
      }
    };
    void fetchRequirements();
  }, []);

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
          setCurrentPasswordTouched(false);
          setNewPasswordTouched(false);
          setConfirmPasswordTouched(false);
          setCurrentPasswordError(null);
          setShowSuccess(true);
          reset();
          if (onSaveComplete) {
            onSaveComplete();
          }
        },
        onError: (error: Error) => {
          logger.error('❌ [SecurityTab] Password change failed', { error });
          // Check if error is due to incorrect password
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
    <div className="space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <Shield size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Password Management</h3>
      </div>

      <div className="space-y-4 max-w-2xl">
        <p className="text-sm text-secondary-foreground">
          Change your password to keep your account secure
        </p>

        {/* Current Password */}
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
            required
            disabled={isChanging}
          />
          {currentPasswordError && (
            <p className="text-[10px] text-danger-text ml-1">{currentPasswordError}</p>
          )}
        </div>

        {/* New Password */}
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
            required
            disabled={isChanging}
          />
          {passwordRequirements && (
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

        {/* Confirm Password */}
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
            required
            disabled={isChanging}
          />
          {confirmPasswordTouched && !passwordsMatch && confirmPassword.length > 0 && (
            <p className="text-[10px] text-danger-text ml-1">Passwords do not match</p>
          )}
        </div>

        {/* Save Button and Success Banner */}
        <div className="pt-1 pb-2">
          <div className="flex items-center gap-3 min-h-[38px]">
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isFormValid}
              isLoading={isChanging}
              loadingText="Changing Password..."
              leftIcon={<Save size={14} />}
              className="flex-shrink-0"
            >
              Change Password
            </Button>

            {/* Success Banner - Appears next to button */}
            {showSuccess && (
              <div className="bg-muted border border-success-border rounded-lg px-3 py-1.5 flex items-center space-x-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <AnimatedCheckmark size={24} className="text-success-text" />
                <span className="text-xs font-medium text-success-text">
                  Password changed successfully
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
          <MonitorSmartphone size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Active Sessions</h3>
        </div>
        <div className="max-w-4xl">
          <p className="text-sm text-secondary-foreground mb-4">
            Manage your active sessions across all devices. You can revoke access from any device.
          </p>
          <SessionListSection />
        </div>
      </div>
    </div>
  );
}
