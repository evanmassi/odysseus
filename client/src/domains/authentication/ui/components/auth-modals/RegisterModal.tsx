/**
 * User Registration Form
 *
 * Researcher profile registration with auto-generated usernames.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { UserRound, KeyRound, Mail, Building2, BriefcaseBusiness, TicketCheck } from 'lucide-react';

import {
  authService,
  type PasswordRequirements as PasswordConfig,
} from '@domains/authentication/services/AuthService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import {
  generateUsernamePreview,
  getValidationState,
  isValidEmail,
} from '@domains/authentication/utils/registrationUtils';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, AuthInput, Button, Toggle } from '@shared/ui';
import { notifications } from '@shared/utils';

import { PasswordRequirements } from '../password/PasswordRequirements';

import { AuthBaseModal } from './AuthBaseModal';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';

interface RegisterModalProps {
  onSwitchToLogin?: () => void;
}

export function RegisterModal({ onSwitchToLogin }: RegisterModalProps) {
  // Invite code fields
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeValidated, setInviteCodeValidated] = useState(false);
  const [inviteCodeLabName, setInviteCodeLabName] = useState<string | null>(null);
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Researcher profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  // Authentication fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Researcher profile creation flag (defaults to true for backward compatibility)
  const [createResearcher, setCreateResearcher] = useState(true);

  // Password validation
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig | null>(null);

  // Field touched state for validation
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Email error state (for duplicate email errors from backend)
  const [emailError, setEmailError] = useState<string | null>(null);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    username: string;
    email: string;
    status: 'approved' | 'pending';
  } | null>(null);

  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const { registerWithResearcher } = useAuthStore();

  const usernamePreview = useMemo(
    () => generateUsernamePreview(firstName, lastName),
    [firstName, lastName]
  );

  useEffect(() => {
    async function loadPasswordRequirements() {
      try {
        const requirements = await authService.getPasswordRequirements();
        setPasswordConfig(requirements);
      } catch (error) {
        logger.error('Failed to load password requirements', { error });
        // Keep default requirements on error
      }
    }
    void loadPasswordRequirements();
  }, []);

  const handleValidateInviteCode = useCallback(async () => {
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setInviteCodeError('Please enter an invite code');
      return;
    }

    setIsValidatingCode(true);
    setInviteCodeError(null);

    try {
      const result = await authService.validateInviteCode(trimmed);
      if (result.valid) {
        setInviteCodeValidated(true);
        setInviteCodeLabName(result.labName ?? null);
      } else {
        setInviteCodeError('Invalid or expired invite code');
        setInviteCodeValidated(false);
      }
    } catch {
      setInviteCodeError('Failed to validate code');
      setInviteCodeValidated(false);
    } finally {
      setIsValidatingCode(false);
    }
  }, [inviteCode]);

  const emailIsValid = useMemo(() => isValidEmail(email), [email]);

  const passwordMeetsRequirements = useMemo(() => {
    if (!passwordConfig || !password) return false;
    return PasswordValidator.validate(password, passwordConfig).isValid;
  }, [password, passwordConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError(null);

    if (!inviteCodeValidated) {
      setInviteCodeError('Please validate your invite code first');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      notifications.error('Please fill in all required fields');
      return;
    }

    if (!emailIsValid) {
      setEmailTouched(true);
      notifications.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      notifications.error('Passwords do not match');
      return;
    }

    if (!passwordMeetsRequirements) {
      setPasswordTouched(true);
      notifications.error('Password does not meet requirements');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerWithResearcher({
        firstName,
        lastName,
        email: email.trim(),
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        password,
        createResearcher,
        inviteCode: inviteCode.trim(),
      });

      if (result.success) {
        setRegistrationResult({
          username: usernamePreview,
          email: email.trim(),
          status: result.status as 'approved' | 'pending',
        });
        setShowSuccessModal(true);
      } else {
        const errorMessage =
          result.message ?? 'Registration failed. Please check your information and try again.';
        if (errorMessage.toLowerCase().includes('email')) {
          setEmailError(errorMessage);
          setEmailTouched(true);
        } else {
          notifications.error(errorMessage);
        }
      }
    } catch (error) {
      notifications.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (onSwitchToLogin) {
      onSwitchToLogin();
    }
  };

  if (showSuccessModal && registrationResult) {
    return (
      <RegistrationSuccessModal
        username={registrationResult.username}
        status={registrationResult.status}
        onClose={handleSuccessModalClose}
      />
    );
  }

  return (
    <AuthBaseModal
      size="large"
      subtitle="Welcome · Create your account to get started"
      initialFocusRef={inviteCodeValidated ? firstNameInputRef : undefined}
      className="max-h-[95vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Invite Code Section */}
        <div className="space-y-1.5">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <AuthInput
                id="inviteCode"
                value={inviteCode}
                onChange={value => {
                  setInviteCode(value);
                  setInviteCodeError(null);
                  if (inviteCodeValidated) {
                    setInviteCodeValidated(false);
                    setInviteCodeLabName(null);
                  }
                }}
                label="Invite code"
                placeholder="Enter your invite code"
                icon={<TicketCheck size={16} />}
                state={inviteCodeError ? 'error' : inviteCodeValidated ? 'success' : 'default'}
                required
                disabled={isLoading || isValidatingCode || inviteCodeValidated}
                maxLength={20}
              />
            </div>
            <Button
              type="button"
              variant={inviteCodeValidated ? 'ghost' : 'secondary'}
              size="md"
              onClick={
                inviteCodeValidated
                  ? () => {
                      setInviteCodeValidated(false);
                      setInviteCodeLabName(null);
                      setInviteCode('');
                    }
                  : handleValidateInviteCode
              }
              isLoading={isValidatingCode}
              disabled={isLoading || (!inviteCodeValidated && !inviteCode.trim())}
              className="shrink-0 mb-px"
            >
              {inviteCodeValidated ? 'Change' : 'Verify'}
            </Button>
          </div>
          {inviteCodeError && (
            <p className="text-[11px] text-danger-text ml-1">{inviteCodeError}</p>
          )}
          {inviteCodeValidated && inviteCodeLabName && (
            <p className="text-[11px] text-success-text ml-1">
              Joining: <span className="font-semibold">{inviteCodeLabName}</span>
            </p>
          )}
        </div>

        {!inviteCodeValidated && (
          <AlertBanner variant="info" spacing="none" className="text-xs">
            You need an invite code from your lab administrator to register.
          </AlertBanner>
        )}

        {inviteCodeValidated && (
          <>
            {/* Name Fields Group */}
            <div className="grid grid-cols-2 gap-3 items-start">
              {/* First Name Column with Username */}
              <div className="space-y-1.5">
                <AuthInput
                  ref={firstNameInputRef}
                  id="firstName"
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

              {/* Last Name */}
              <AuthInput
                id="lastName"
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

            {/* Contact & Work Info Group */}
            <div className="space-y-2">
              {/* Email */}
              <div className="space-y-1">
                <AuthInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={value => {
                    setEmail(value);
                    setEmailError(null);
                  }}
                  onBlur={() => {
                    setEmail(email.trim());
                    setEmailTouched(true);
                  }}
                  label="Email"
                  placeholder="name@institution.edu"
                  icon={<Mail size={16} />}
                  state={emailError ? 'error' : getValidationState(emailTouched, emailIsValid)}
                  required
                  disabled={isLoading}
                  maxLength={255}
                />
                {emailError && <p className="text-[11px] text-danger-text ml-1">{emailError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 items-start">
                {/* Department */}
                <AuthInput
                  id="department"
                  value={department}
                  onChange={setDepartment}
                  label="Department"
                  placeholder="Department name"
                  icon={<Building2 size={16} />}
                  disabled={isLoading}
                  maxLength={100}
                />

                {/* Position */}
                <AuthInput
                  id="position"
                  value={position}
                  onChange={setPosition}
                  label="Position"
                  placeholder="Title or role"
                  icon={<BriefcaseBusiness size={16} />}
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>

              {/* Researcher Profile Toggle */}
              <div className="ml-1">
                <div className="flex items-center space-x-1.5 cursor-pointer group">
                  <Toggle
                    checked={createResearcher}
                    onChange={setCreateResearcher}
                    disabled={isLoading}
                    size="sm"
                    aria-label="I am a researcher"
                  />
                  <span className="text-xs text-secondary-foreground group-hover:text-accent-foreground">
                    I am a researcher
                  </span>
                </div>
              </div>
            </div>

            {/* Password Fields Group */}
            <div className="pt-3 border-t border-border space-y-2">
              <div>
                <AuthInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  onBlur={() => setPasswordTouched(true)}
                  label="Password"
                  placeholder="Choose a secure password"
                  icon={<KeyRound size={16} />}
                  state={getValidationState(passwordTouched, passwordMeetsRequirements)}
                  required
                  disabled={isLoading}
                />

                {passwordConfig && (
                  <PasswordRequirements
                    password={password}
                    config={passwordConfig}
                    showError={passwordTouched && !passwordMeetsRequirements}
                    className="ml-2"
                  />
                )}
              </div>

              {/* Confirm Password */}
              <AuthInput
                id="confirmPassword"
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

            <Button
              type="submit"
              variant="primary"
              size="xl"
              fullWidth
              isLoading={isLoading}
              loadingText="Creating your account..."
              className="shadow-lg font-bold mt-2.5"
            >
              Create Account
            </Button>

            <AlertBanner variant="info" spacing="none" className="text-xs">
              New users require lab admin approval before accessing the system.
            </AlertBanner>
          </>
        )}
      </form>

      {onSwitchToLogin && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-action [[data-theme=dark]_&]:text-action/70 font-semibold hover:text-action-hover [[data-theme=dark]_&]:hover:text-action/90 transition-colors rounded px-1"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </AuthBaseModal>
  );
}
