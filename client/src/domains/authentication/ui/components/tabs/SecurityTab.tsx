/**
 * Security Tab
 *
 * Password management for authenticated users.
 * Requires current password verification for security.
 */
import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound, Save, Eye, EyeOff, Shield, MonitorSmartphone } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useChangePassword } from '@domains/users/hooks/useChangePassword';
import { AnimatedCheckmark } from '@shared/components';
import { logger } from '@shared/infrastructure/logger';
import { Button } from '@shared/ui';
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

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const getFieldBorderClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'border-border';
    return isValid ? 'border-emerald-500' : 'input-field-error';
  };

  const getLabelColorClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'text-secondary-foreground';
    return isValid ? 'text-emerald-700' : 'text-validation-error-label';
  };

  // Current password field styling - neutral (no green) with error state only
  const getCurrentPasswordBorderClass = () => {
    return currentPasswordError ? 'input-field-error' : 'border-border';
  };

  const getCurrentPasswordLabelClass = () => {
    return currentPasswordError ? 'text-validation-error-label' : 'text-secondary-foreground';
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
          <div className={`auth-input-container ${getCurrentPasswordBorderClass()}`}>
            <label
              htmlFor="security-currentPassword"
              className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold transition-colors ${getCurrentPasswordLabelClass()}`}
            >
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <KeyRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="security-currentPassword"
                value={currentPassword}
                onChange={e => {
                  setCurrentPassword(e.target.value);
                  setShowSuccess(false);
                  // Clear error when user starts typing
                  if (currentPasswordError) {
                    setCurrentPasswordError(null);
                  }
                }}
                className="pl-7 pr-10 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Enter current password"
                required
                disabled={isChanging}
              />
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          {currentPasswordError && (
            <p className="text-[10px] text-red-600 ml-1 mt-1">{currentPasswordError}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <div
            className={`auth-input-container ${getFieldBorderClass(newPasswordTouched, newPasswordMeetsRequirements && newPasswordIsDifferent)}`}
          >
            <label
              htmlFor="security-newPassword"
              className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(newPasswordTouched, newPasswordMeetsRequirements && newPasswordIsDifferent)}`}
            >
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <KeyRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="security-newPassword"
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  setShowSuccess(false);
                }}
                onBlur={() => setNewPasswordTouched(true)}
                className="pl-7 pr-10 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Enter new password"
                required
                disabled={isChanging}
              />
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          {passwordRequirements && (
            <PasswordRequirements
              password={newPassword}
              config={passwordRequirements}
              showError={newPasswordTouched && !newPasswordMeetsRequirements}
            />
          )}

          {!newPasswordIsDifferent && newPasswordTouched && (
            <p className="text-[10px] text-red-600 ml-1 mt-1">
              New password must be different from current password
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <div
            className={`auth-input-container ${getFieldBorderClass(confirmPasswordTouched, passwordsMatch)}`}
          >
            <label
              htmlFor="security-confirmPassword"
              className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(confirmPasswordTouched, passwordsMatch)}`}
            >
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <KeyRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="security-confirmPassword"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setShowSuccess(false);
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
                className="pl-7 pr-10 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Confirm new password"
                required
                disabled={isChanging}
              />
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          {confirmPasswordTouched && !passwordsMatch && confirmPassword.length > 0 && (
            <p className="text-[10px] text-red-600 ml-1 mt-1">Passwords do not match</p>
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center space-x-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <AnimatedCheckmark size={24} />
                <span className="text-xs font-medium text-emerald-900">
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
