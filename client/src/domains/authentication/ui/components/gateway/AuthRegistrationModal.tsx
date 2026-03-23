/**
 * User Registration Form
 *
 * Invite-code-based registration with auto-generated usernames.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

import { PasswordValidator, type PublicUserData } from '@odysseus/shared-schemas';
import {
  UserRound,
  KeyRound,
  Mail,
  Building2,
  BriefcaseBusiness,
  TicketCheck,
  Info,
} from 'lucide-react';

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
import { logger } from '@infra/logger';
import { AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { PasswordRequirements } from '../password/PasswordRequirements';

import { AuthBaseModal } from './AuthBaseModal';
import { AuthRegistrationSuccessModal } from './AuthRegistrationSuccessModal';

import type { TokenPair } from '@shared/types/sessionTypes';

interface AuthRegistrationModalProps {
  onSwitchToLogin?: () => void;
}

export function AuthRegistrationModal({ onSwitchToLogin }: AuthRegistrationModalProps) {
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

  const [codeRole, setCodeRole] = useState<'lab_admin' | 'user' | null>(null);
  const [codeCreateResearcher, setCodeCreateResearcher] = useState(false);

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
    user: PublicUserData;
    tokens: TokenPair;
  } | null>(null);

  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const { registerWithProfile, completeRegistration } = useAuthStore();

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
        setCodeRole(result.role ?? null);
        setCodeCreateResearcher(result.createResearcher ?? false);
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
      const result = await registerWithProfile({
        firstName,
        lastName,
        email: email.trim(),
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        password,
        inviteCode: inviteCode.trim(),
      });

      if (result.success && result.user && result.tokens) {
        setRegistrationResult({
          username: usernamePreview,
          email: email.trim(),
          user: result.user,
          tokens: result.tokens,
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
    if (registrationResult) {
      completeRegistration(registrationResult.user, registrationResult.tokens);
    }
    setShowSuccessModal(false);
  };

  if (showSuccessModal && registrationResult) {
    return (
      <AuthRegistrationSuccessModal
        username={registrationResult.username}
        onClose={handleSuccessModalClose}
      />
    );
  }

  return (
    <AuthBaseModal
      size={inviteCodeValidated ? 'large' : 'default'}
      subtitle={
        inviteCodeValidated
          ? 'Welcome · Create your account to get started'
          : 'Enter your invite code to get started'
      }
      initialFocusRef={inviteCodeValidated ? firstNameInputRef : undefined}
      className="max-h-[95vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Invite Code Section */}
        {!inviteCodeValidated ? (
          <div className="space-y-3">
            <AuthInput
              id="inviteCode"
              value={inviteCode}
              onChange={value => {
                setInviteCode(value);
                setInviteCodeError(null);
              }}
              label="Invite code"
              placeholder="Enter your invite code"
              icon={<TicketCheck size={16} />}
              state={inviteCodeError ? 'error' : 'default'}
              required
              disabled={isLoading || isValidatingCode}
              maxLength={20}
            />
            {inviteCodeError && (
              <p className="text-[11px] text-danger-text ml-1 -mt-2">{inviteCodeError}</p>
            )}
            <Button
              type="button"
              variant="primary"
              size="xl"
              fullWidth
              onClick={handleValidateInviteCode}
              isLoading={isValidatingCode}
              disabled={isLoading || !inviteCode.trim()}
              className="shadow-lg font-bold"
            >
              Verify
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2 items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <TicketCheck size={14} className="text-success-text shrink-0" />
                <code className="text-sm font-mono font-semibold text-foreground">
                  {inviteCode}
                </code>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-success-text">{inviteCodeLabName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInviteCodeValidated(false);
                  setInviteCodeLabName(null);
                  setCodeRole(null);
                  setCodeCreateResearcher(false);
                  setInviteCode('');
                }}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {inviteCodeValidated && (
          <>
            <div className="border-t border-border" />
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
            <div className="space-y-3">
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

              <div className="flex items-center gap-1.5 ml-1">
                <Info size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {codeRole === 'lab_admin'
                    ? "You'll have lab administrator privileges and researcher access."
                    : codeCreateResearcher
                      ? 'Your account includes researcher access.'
                      : 'Your account includes standard access only.'}
                </p>
              </div>
            </div>

            {/* Password Fields Group */}
            <div className="pt-3 border-t border-border space-y-3">
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
                    className="ml-2 mb-1"
                  />
                )}
              </div>

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
