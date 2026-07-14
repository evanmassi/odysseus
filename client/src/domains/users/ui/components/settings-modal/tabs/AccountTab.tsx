/**
 * Account Profile Editor
 *
 * User profile management with password confirmation requirement.
 */
import { useState, useEffect, useMemo } from 'react';

import { UserRound, Mail, Building2, BriefcaseBusiness, KeyRound, Save } from 'lucide-react';

import { useIsDemo } from '@domains/authentication';
import { useUserProfile, useUserProfileActions } from '@domains/users/hooks/useUserProfile';
import { logger } from '@infra/logger';
import { AuthInput, Button, ConsolePanel, LoadingSpinner, Subsection } from '@shared/ui';
import { notifications } from '@shared/utils';
import { getValidationState, isValidEmail } from '@shared/utils/fieldValidation';

import { DemoModeBanner } from '../DemoModeBanner';

import type { UpdatePersonProfileWithPassword } from '@domains/users/services/PersonService';

interface AccountTabProps {
  /** Reports the number of unsaved profile field edits to the modal footer. */
  onDirtyChange?: (count: number) => void;
}

export function AccountTab({ onDirtyChange }: AccountTabProps) {
  const isDemo = useIsDemo();
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

  const emailIsValid = useMemo(() => isValidEmail(email), [email]);

  const dirtyCount = useMemo(() => {
    if (!profile) return 0;
    let count = 0;
    if (firstName !== profile.firstName) count++;
    if (lastName !== profile.lastName) count++;
    if (email !== profile.email) count++;
    if (department !== (profile.department ?? '')) count++;
    if (position !== (profile.position ?? '')) count++;
    return count;
  }, [profile, firstName, lastName, email, department, position]);

  const hasChanges = dirtyCount > 0;

  useEffect(() => {
    onDirtyChange?.(dirtyCount);
  }, [dirtyCount, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(0), [onDirtyChange]);

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
    // Send the empty string rather than undefined: JSON.stringify drops undefined, and an absent
    // field means "unchanged" to the server, which is what made these fields unclearable.
    if (department !== (profile?.department ?? '')) updateData.department = department.trim();
    if (position !== (profile?.position ?? '')) updateData.position = position.trim();

    updateProfile(updateData, {
      onSuccess: () => {
        notifications.success('Profile updated successfully');
        setCurrentPassword('');
        setPasswordTouched(false);
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
        <LoadingSpinner size="md" className="text-primary" />
      </div>
    );
  }

  return (
    <ConsolePanel intensity="soft">
      <Subsection title="Identity" index={1} accent>
        <div className="col-span-2 space-y-4 py-4">
          <DemoModeBanner />

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
        </div>
      </Subsection>

      {hasChanges && (
        <Subsection title="Confirm Changes" index={2} accent>
          <div className="col-span-2 space-y-3 py-4">
            <p className="text-body-sm text-secondary-foreground">
              Enter your current password to save changes
            </p>

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
              className="mt-1"
            >
              Save Changes
            </Button>
          </div>
        </Subsection>
      )}
    </ConsolePanel>
  );
}
