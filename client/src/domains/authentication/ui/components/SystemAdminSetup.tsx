/**
 * System Admin Setup
 *
 * One-time setup screen for creating the initial system administrator.
 * Shown when no system admin exists (detected during bootstrap).
 */

import { useState, useRef, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { UserRound, KeyRound, Mail, ShieldCheck, Building2, BriefcaseBusiness } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useAuthStore, sessionManager } from '@domains/authentication/stores/authStore';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { AuthBaseModal } from './AuthBaseModal';

export function SystemAdminSetup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);

  const requireSetupKey = !!import.meta.env['VITE_REQUIRE_SETUP_KEY'];

  const usernamePreview = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return '';
    const cleanFirst = firstName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const cleanLast = lastName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    if (!cleanFirst || !cleanLast) return '';
    return `${cleanFirst}.${cleanLast}`;
  }, [firstName, lastName]);

  const getValidationState = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'default' as const;
    return isValid ? ('success' as const) : ('error' as const);
  };

  const emailIsValid = useMemo(() => {
    if (!email.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const passwordIsValid = useMemo(() => {
    if (!password) return false;
    return PasswordValidator.validate(password, {
      passwordMinLength: 8,
      requireStrongPasswords: false,
      passwordRequireSpecialChars: false,
    }).isValid;
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      notifications.error('Please fill in all required fields');
      return;
    }

    if (!emailIsValid) {
      setEmailTouched(true);
      notifications.error('Please enter a valid email address');
      return;
    }

    if (!passwordIsValid) {
      setPasswordTouched(true);
      notifications.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      notifications.error('Passwords do not match');
      return;
    }

    if (requireSetupKey && !setupKey.trim()) {
      notifications.error('Setup key is required');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.setupSystemAdmin({
        username: usernamePreview,
        password,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        setupKey: setupKey.trim() || undefined,
        department: department.trim() || undefined,
        position: position.trim() || undefined,
      });

      sessionManager.setTokens(result.tokens);
      useAuthStore
        .getState()
        .setAuthData({ ...result.user, lastActivity: new Date().toISOString() }, result.tokens);

      notifications.success('System admin account created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Setup failed';
      notifications.error(message);
      logger.error('System admin setup failed', { error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBaseModal
      size="large"
      subtitle="System Administrator Setup"
      initialFocusRef={firstNameRef}
      className="max-h-[95vh] overflow-y-auto"
    >
      <AlertBanner variant="info" spacing="none" className="text-xs mb-3">
        No system administrator exists yet. Create one to manage labs and global settings.
      </AlertBanner>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="space-y-1.5">
            <AuthInput
              ref={firstNameRef}
              id="sysadmin-firstName"
              value={firstName}
              onChange={setFirstName}
              onBlur={() => setFirstNameTouched(true)}
              label="First name"
              placeholder="First name"
              icon={<UserRound size={16} />}
              state={getValidationState(firstNameTouched, firstName.trim().length > 0)}
              required
              disabled={isLoading}
              maxLength={50}
            />
            <div className="min-h-[18px] ml-1">
              {usernamePreview ? (
                <p className="text-[10px] text-secondary-foreground">
                  Username:{' '}
                  <span className="font-mono font-semibold text-action [[data-theme=dark]_&]:text-action/70">
                    {usernamePreview}
                  </span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Username:</p>
              )}
            </div>
          </div>

          <AuthInput
            id="sysadmin-lastName"
            value={lastName}
            onChange={setLastName}
            onBlur={() => setLastNameTouched(true)}
            label="Last name"
            placeholder="Last name"
            icon={<UserRound size={16} />}
            state={getValidationState(lastNameTouched, lastName.trim().length > 0)}
            required
            disabled={isLoading}
            maxLength={50}
          />
        </div>

        {/* Email */}
        <AuthInput
          id="sysadmin-email"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setEmailTouched(true)}
          label="Email"
          placeholder="admin@institution.edu"
          icon={<Mail size={16} />}
          state={getValidationState(emailTouched, emailIsValid)}
          required
          disabled={isLoading}
          maxLength={255}
        />

        {/* Department & Position */}
        <div className="grid grid-cols-2 gap-3 items-start">
          <AuthInput
            id="sysadmin-department"
            value={department}
            onChange={setDepartment}
            label="Department"
            placeholder="Department name"
            icon={<Building2 size={16} />}
            disabled={isLoading}
            maxLength={100}
          />

          <AuthInput
            id="sysadmin-position"
            value={position}
            onChange={setPosition}
            label="Position"
            placeholder="Title or role"
            icon={<BriefcaseBusiness size={16} />}
            disabled={isLoading}
            maxLength={100}
          />
        </div>

        {/* Password Fields */}
        <div className="pt-3 border-t border-border space-y-2">
          <AuthInput
            id="sysadmin-password"
            type="password"
            value={password}
            onChange={setPassword}
            onBlur={() => setPasswordTouched(true)}
            label="Password"
            placeholder="At least 8 characters"
            icon={<KeyRound size={16} />}
            state={getValidationState(passwordTouched, passwordIsValid)}
            required
            disabled={isLoading}
          />

          <AuthInput
            id="sysadmin-confirm"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            label="Confirm password"
            placeholder="Confirm password"
            icon={<KeyRound size={16} />}
            state={getValidationState(!!confirmPassword, password === confirmPassword)}
            required
            disabled={isLoading}
          />
        </div>

        {requireSetupKey && (
          <AuthInput
            id="sysadmin-key"
            type="password"
            value={setupKey}
            onChange={setSetupKey}
            label="Setup key"
            placeholder="Environment setup key"
            icon={<ShieldCheck size={16} />}
            required
            disabled={isLoading}
          />
        )}

        <Button
          type="submit"
          variant="primary"
          size="xl"
          fullWidth
          isLoading={isLoading}
          loadingText="Creating system admin..."
          className="shadow-lg font-bold mt-2"
        >
          Create System Admin
        </Button>
      </form>
    </AuthBaseModal>
  );
}
