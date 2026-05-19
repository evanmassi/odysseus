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

import { useDelayedTransition } from '@domains/authentication/hooks/useDelayedTransition';
import { useShellConfig } from '@domains/authentication/hooks/useShellConfig';
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

  const inputRegState: 'invite' | 'form' | 'success' =
    showSuccessModal && !!registrationResult ? 'success' : inviteCodeValidated ? 'form' : 'invite';
  const { displayed: regState, isTransitioning } = useDelayedTransition(inputRegState, 200);
  const exitClass = isTransitioning ? 'animate-auth-stack-exit' : '';

  useShellConfig(
    regState === 'success'
      ? {
          contentKey: 'registration:success',
          variant: 'stack',
          width: 'narrow',
          showBranding: 'icon',
        }
      : {
          contentKey: regState === 'form' ? 'registration:form' : 'registration:invite',
          variant: 'console',
          width: regState === 'form' ? 'wide' : 'narrow',
          showBranding: true,
          brandGreeting: 'Registration',
          microheader: regState === 'form' ? 'Account details' : 'Enter invite code',
          initialFocusRef: regState === 'form' ? firstNameInputRef : undefined,
        }
  );

  if (regState === 'success' && registrationResult) {
    return (
      <AuthRegistrationSuccessModal
        username={registrationResult.username}
        onClose={handleSuccessModalClose}
      />
    );
  }

  return (
    <div key={regState} className={`animate-auth-stack ${exitClass}`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {regState !== 'form' ? (
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
              variant="console"
              required
              disabled={isLoading || isValidatingCode}
              maxLength={20}
            />
            {inviteCodeError && (
              <p className="font-mono text-[11px] text-danger-text ml-1 -mt-1">{inviteCodeError}</p>
            )}
            <Button
              type="button"
              variant="console"
              fullWidth
              onClick={handleValidateInviteCode}
              isLoading={isValidatingCode}
              disabled={isLoading || !inviteCode.trim()}
            >
              Verify
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 h-7 bg-[rgb(var(--auth-ambient)/0.07)] border border-[rgb(var(--auth-ambient)/0.25)] min-w-0">
              <TicketCheck size={11} className="text-[rgb(var(--auth-ambient))] shrink-0" />
              <code className="font-mono text-xs text-[rgb(var(--auth-text))] truncate">
                {inviteCode}
              </code>
              <span className="font-mono text-[10px] text-[rgb(var(--auth-text-faint))]">·</span>
              <span className="font-mono text-[10px] text-[rgb(var(--auth-ambient))] truncate">
                {inviteCodeLabName}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
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
        )}

        {regState === 'form' && (
          <>
            <div className="grid grid-cols-2 gap-3 items-start">
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
                  variant="console"
                  required
                  disabled={isLoading}
                  maxLength={50}
                />
                <div className="min-h-[18px] ml-1 font-mono text-[10px]">
                  {usernamePreview ? (
                    <p className="text-[rgb(var(--auth-text-mute))]">
                      Username:{' '}
                      <span className="text-[rgb(var(--auth-ambient))]">{usernamePreview}</span>
                    </p>
                  ) : (
                    <p className="text-[rgb(var(--auth-text-faint))]">Username:</p>
                  )}
                </div>
              </div>

              <AuthInput
                id="lastName"
                value={lastName}
                onChange={setLastName}
                onBlur={() => setLastNameTouched(true)}
                label="Last name"
                placeholder="Last name"
                icon={<UserRound size={16} />}
                state={getValidationState(lastNameTouched, lastName.trim().length > 0)}
                variant="console"
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            <div className="space-y-4">
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
                  variant="console"
                  required
                  disabled={isLoading}
                  maxLength={255}
                />
                {emailError && (
                  <p className="font-mono text-[11px] text-danger-text ml-1">{emailError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-start">
                <AuthInput
                  id="department"
                  value={department}
                  onChange={setDepartment}
                  label="Department"
                  placeholder="Department name"
                  icon={<Building2 size={16} />}
                  variant="console"
                  disabled={isLoading}
                  maxLength={100}
                />

                <AuthInput
                  id="position"
                  value={position}
                  onChange={setPosition}
                  label="Position"
                  placeholder="Title or role"
                  icon={<BriefcaseBusiness size={16} />}
                  variant="console"
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>

              <div className="flex items-center gap-1.5 ml-1">
                <Info size={14} className="text-[rgb(var(--auth-text-mute))] shrink-0" />
                <p className="font-mono text-xs text-[rgb(var(--auth-text-dim))]">
                  {codeRole === 'lab_admin'
                    ? "You'll have lab administrator privileges and researcher access."
                    : codeCreateResearcher
                      ? 'Your account includes researcher access.'
                      : 'Your account includes standard access only.'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[rgb(var(--auth-divider))] space-y-4">
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
                  variant="console"
                  required
                  disabled={isLoading}
                />

                {passwordConfig && (
                  <PasswordRequirements
                    password={password}
                    config={passwordConfig}
                    showError={passwordTouched && !passwordMeetsRequirements}
                    variant="console"
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
                variant="console"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="console"
              fullWidth
              isLoading={isLoading}
              loadingText="Creating your account..."
              className="mt-2"
            >
              Create Account
            </Button>
          </>
        )}
      </form>

      {onSwitchToLogin && (
        <div className="mt-5 text-center">
          <p className="font-mono text-xs text-[rgb(var(--auth-text-mute))]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[rgb(var(--auth-ambient))] hover:opacity-80 transition-opacity rounded px-1"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
