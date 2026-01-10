/**
 * Account Tab
 *
 * User profile management with password confirmation requirement.
 * Uses label-in-border styling matching RegisterModal.
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

import { useUserProfile, useUserProfileActions } from '@domains/users/hooks/useUserProfile';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils';

import type { UpdatePersonProfileWithPassword } from '@domains/users/services/PersonService';

interface AccountTabProps {
  onSaveComplete?: () => void;
}

export function AccountTab({ onSaveComplete }: AccountTabProps) {
  const { profile, isLoading } = useUserProfile();
  const { updateProfile, isUpdating } = useUserProfileActions();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // Touched state for validation
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
      setDepartment(profile.department ?? '');
      setPosition(profile.position ?? '');
    }
  }, [profile]);

  // Field border styling
  const getFieldBorderClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'border-gray-300';
    return isValid ? 'border-emerald-500' : 'input-field-error';
  };

  // Label color styling
  const getLabelColorClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'text-gray-700';
    return isValid ? 'text-emerald-700' : 'text-validation-error-label';
  };

  // Email validation
  const emailIsValid = useMemo(() => {
    if (!email.trim()) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }, [email]);

  // Check if there are changes
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
    // Validation
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

    // Build update object
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
        setCurrentPassword(''); // Clear password field
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
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-4">
        <UserRound size={22} className="text-gray-700" />
        <h3 className="text-xl font-semibold text-gray-900">Account Information</h3>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          {/* First Name */}
          <div
            className={`auth-input-container ${getFieldBorderClass(firstNameTouched, firstName.trim().length > 0)}`}
          >
            <label
              htmlFor="account-firstName"
              className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(firstNameTouched, firstName.trim().length > 0)}`}
            >
              First Name <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <UserRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
                size={16}
              />
              <input
                type="text"
                id="account-firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                onBlur={() => setFirstNameTouched(true)}
                className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="First name"
                required
                disabled={isUpdating}
                maxLength={50}
              />
            </div>
          </div>

          {/* Last Name */}
          <div
            className={`auth-input-container ${getFieldBorderClass(lastNameTouched, lastName.trim().length > 0)}`}
          >
            <label
              htmlFor="account-lastName"
              className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(lastNameTouched, lastName.trim().length > 0)}`}
            >
              Last Name <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <UserRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
                size={16}
              />
              <input
                type="text"
                id="account-lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onBlur={() => setLastNameTouched(true)}
                className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Last name"
                required
                disabled={isUpdating}
                maxLength={50}
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className={`auth-input-container ${getFieldBorderClass(emailTouched, emailIsValid)}`}>
          <label
            htmlFor="account-email"
            className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(emailTouched, emailIsValid)}`}
          >
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative px-3 py-2">
            <Mail
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
              size={16}
            />
            <input
              type="email"
              id="account-email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
              }}
              onBlur={e => {
                setEmail(e.target.value.trim());
                setEmailTouched(true);
              }}
              className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
              placeholder="name@institution.edu"
              required
              disabled={isUpdating}
              maxLength={255}
            />
          </div>
        </div>

        {/* Department & Position */}
        <div className="grid grid-cols-2 gap-3">
          {/* Department */}
          <div className="auth-input-container border-gray-300">
            <label
              htmlFor="account-department"
              className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-gray-700"
            >
              Department
            </label>
            <div className="relative px-3 py-2">
              <Building2
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
                size={16}
              />
              <input
                type="text"
                id="account-department"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Department name"
                disabled={isUpdating}
                maxLength={100}
              />
            </div>
          </div>

          {/* Position */}
          <div className="auth-input-container border-gray-300">
            <label
              htmlFor="account-position"
              className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-gray-700"
            >
              Position
            </label>
            <div className="relative px-3 py-2">
              <BriefcaseBusiness
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
                size={16}
              />
              <input
                type="text"
                id="account-position"
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Title or role"
                disabled={isUpdating}
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* Password Confirmation Section */}
        {hasChanges && (
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-900">Confirm Changes</p>
              <p className="text-xs text-gray-600">Enter your current password to save changes</p>
            </div>

            <div
              className={`auth-input-container ${getFieldBorderClass(passwordTouched, currentPassword.trim().length > 0)}`}
            >
              <label
                htmlFor="account-currentPassword"
                className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold transition-colors ${getLabelColorClass(passwordTouched, currentPassword.trim().length > 0)}`}
              >
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative px-3 py-2">
                <KeyRound
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-odysseus-muted"
                  size={16}
                />
                <input
                  type="password"
                  id="account-currentPassword"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="Enter current password"
                  required
                  disabled={isUpdating}
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isUpdating || !currentPassword.trim()}
              className="btn btn-primary flex items-center space-x-2 text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}

        {!hasChanges && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic">No changes to save</p>
          </div>
        )}
      </div>
    </div>
  );
}
