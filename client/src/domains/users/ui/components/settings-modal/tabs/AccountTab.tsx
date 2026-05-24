/**
 * Account Profile Editor
 *
 * User profile management with password confirmation requirement.
 */
import { useState, useEffect, useMemo } from 'react';

import {
  UserRound,
  Mail,
  Building2,
  BriefcaseBusiness,
  KeyRound,
  Save,
  RefreshCw,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication/stores/authStore';
import { useUserProfile, useUserProfileActions } from '@domains/users/hooks/useUserProfile';
import { logger } from '@infra/logger';
import { AlertBanner, AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import type { UpdatePersonProfileWithPassword } from '@domains/users/services/PersonService';

function getValidationState(touched: boolean, isValid: boolean) {
  if (!touched) return 'default' as const;
  return isValid ? ('success' as const) : ('error' as const);
}

interface AccountTabProps {
  onSaveComplete?: () => void;
}

export function AccountTab({ onSaveComplete }: AccountTabProps) {
  const user = useAuthStore(state => state.user);
  const isDemo = user?.isDemo ?? false;
  const { profile, isLoading } = useUserProfile();
  const { updateProfile, isUpdating } = useUserProfileActions();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
      setDepartment(profile.department ?? '');
      setPosition(profile.position ?? '');
    }
  }, [profile]);

  const emailIsValid = useMemo(() => {
    if (!email.trim()) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }, [email]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      firstName !== profile.firstName ||
      lastName !== profile.lastName ||
      email !== profile.email ||
      department !== (profile.department ?? '') ||
      position !== (profile.position ?? '')
    );
  }, [profile, firstName, lastName, email, department, position]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      notifications.error('First name, last name, and email are required');
      return;
    }

    if (!emailIsValid) {
      setEmailTouched(true);
      notifications.error('Please enter a valid email address');
      return;
    }

    if (!currentPassword.trim()) {
      setPasswordTouched(true);
      notifications.error('Current password is required to update your profile');
      return;
    }

    const updateData: UpdatePersonProfileWithPassword = {
      currentPassword,
    };

    if (firstName !== profile?.firstName) updateData.firstName = firstName.trim();
    if (lastName !== profile?.lastName) updateData.lastName = lastName.trim();
    if (email !== profile?.email) updateData.email = email.trim();
    if (department !== (profile?.department ?? ''))
      updateData.department = department.trim() || undefined;
    if (position !== (profile?.position ?? '')) updateData.position = position.trim() || undefined;

    updateProfile(updateData, {
      onSuccess: () => {
        notifications.success('Profile updated successfully');
        setCurrentPassword('');
        setPasswordTouched(false);
        if (onSaveComplete) {
          onSaveComplete();
        }
      },
      onError: (error: Error) => {
        logger.error('AccountTab update failed', { error });
        if (error.message.includes('password')) {
          setPasswordTouched(true);
        }
        notifications.error(error.message || 'Failed to update profile');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-action" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <UserRound size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Account Information</h3>
      </div>

      <div className="space-y-4 max-w-2xl">
        {isDemo && (
          <AlertBanner variant="demo" spacing="sm">
            Account changes are not available in demo mode
          </AlertBanner>
        )}

        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            id="account-firstName"
            value={firstName}
            onChange={setFirstName}
            onBlur={() => setFirstNameTouched(true)}
            label="First Name"
            placeholder="First name"
            icon={<UserRound size={16} />}
            state={getValidationState(firstNameTouched, firstName.trim().length > 0)}
            variant="console"
            required
            disabled={isUpdating || isDemo}
            maxLength={50}
          />

          <AuthInput
            id="account-lastName"
            value={lastName}
            onChange={setLastName}
            onBlur={() => setLastNameTouched(true)}
            label="Last Name"
            placeholder="Last name"
            icon={<UserRound size={16} />}
            state={getValidationState(lastNameTouched, lastName.trim().length > 0)}
            variant="console"
            required
            disabled={isUpdating || isDemo}
            maxLength={50}
          />
        </div>

        <AuthInput
          id="account-email"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => {
            setEmail(email.trim());
            setEmailTouched(true);
          }}
          label="Email"
          placeholder="name@institution.edu"
          icon={<Mail size={16} />}
          state={getValidationState(emailTouched, emailIsValid)}
          variant="console"
          required
          disabled={isUpdating || isDemo}
          maxLength={255}
        />

        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            id="account-department"
            value={department}
            onChange={setDepartment}
            label="Department"
            placeholder="Department name"
            icon={<Building2 size={16} />}
            variant="console"
            disabled={isUpdating || isDemo}
            maxLength={100}
          />

          <AuthInput
            id="account-position"
            value={position}
            onChange={setPosition}
            label="Position"
            placeholder="Title or role"
            icon={<BriefcaseBusiness size={16} />}
            variant="console"
            disabled={isUpdating || isDemo}
            maxLength={100}
          />
        </div>

        {hasChanges && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="mb-2">
              <p className="text-sm font-semibold text-card-foreground">Confirm Changes</p>
              <p className="text-xs text-secondary-foreground">
                Enter your current password to save changes
              </p>
            </div>

            <AuthInput
              id="account-currentPassword"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              onBlur={() => setPasswordTouched(true)}
              label="Current Password"
              placeholder="Enter current password"
              icon={<KeyRound size={16} />}
              state={getValidationState(passwordTouched, currentPassword.trim().length > 0)}
              variant="console"
              required
              disabled={isUpdating || isDemo}
            />

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!currentPassword.trim() || isDemo}
              isLoading={isUpdating}
              loadingText="Saving..."
              leftIcon={<Save size={14} />}
              className="mt-3"
            >
              Save Changes
            </Button>
          </div>
        )}

        {!hasChanges && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground italic">No changes to save</p>
          </div>
        )}
      </div>
    </div>
  );
}
