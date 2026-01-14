/**
 * RegisterModal - First-time setup component
 *
 * Uses researcher profile registration with auto-generated usernames.
 * Delegates business logic to authStore and AuthService.
 */

import { useState, useRef, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import {
  UserRound,
  KeyRound,
  Mail,
  Building2,
  BriefcaseBusiness,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  authService,
  type PasswordRequirements as PasswordConfig,
} from '@domains/authentication/services/AuthenticationService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils';

import { AuthBaseModal } from './AuthBaseModal';
import { PasswordRequirements } from './PasswordRequirements';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';

interface RegisterModalProps {
  onSwitchToLogin?: () => void;
}

export function RegisterModal({ onSwitchToLogin }: RegisterModalProps) {
  // Researcher profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  // Authentication fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // Auto-generate username preview from researcher name
  const usernamePreview = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) {
      return '';
    }
    const cleanFirst = firstName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const cleanLast = lastName
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    if (!cleanFirst || !cleanLast) {
      return '';
    }
    return `${cleanFirst}.${cleanLast}`;
  }, [firstName, lastName]);

  // Fetch password requirements on mount
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

  // Helper function to get field border class for container
  const getFieldBorderClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'border-slate-200';
    return isValid ? 'border-emerald-500' : 'input-field-error';
  };

  // Helper function to get label color class
  const getLabelColorClass = (touched: boolean, isValid: boolean) => {
    if (!touched) return 'text-slate-400';
    return isValid ? 'text-emerald-700' : 'text-validation-error-label';
  };

  // Validate email format
  const emailIsValid = useMemo(() => {
    if (!email.trim()) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }, [email]);

  // Validate password meets all requirements using shared validator
  const passwordMeetsRequirements = useMemo(() => {
    if (!passwordConfig || !password) return false;
    return PasswordValidator.validate(password, passwordConfig).isValid;
  }, [password, passwordConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous email error
    setEmailError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      notifications.error('Please fill in all required fields');
      return;
    }

    // Email format validation
    if (!emailIsValid) {
      setEmailTouched(true);
      notifications.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      notifications.error('Passwords do not match');
      return;
    }

    // Client-side password requirements validation
    if (!passwordMeetsRequirements) {
      setPasswordTouched(true); // Show red error state
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
      });

      if (result.success) {
        // Store registration result and show success modal
        setRegistrationResult({
          username: usernamePreview,
          email: email.trim(),
          status: result.status as 'approved' | 'pending',
        });
        setShowSuccessModal(true);
      } else {
        // Check if it's an email-specific error
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
    // Redirect to login if needed
    if (onSwitchToLogin) {
      onSwitchToLogin();
    }
  };

  // Show success modal if registration was successful
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
      initialFocusRef={firstNameInputRef}
      className="max-h-[95vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name Fields Group */}
        <div className="grid grid-cols-2 gap-3 items-start">
          {/* First Name Column with Username */}
          <div className="space-y-1.5">
            <div
              className={`auth-input-container ${getFieldBorderClass(firstNameTouched, firstName.trim().length > 0)}`}
            >
              <label
                htmlFor="firstName"
                className={`absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium transition-colors ${getLabelColorClass(firstNameTouched, firstName.trim().length > 0)}`}
              >
                First name <span className="text-red-500">*</span>
              </label>
              <div className="relative px-3 py-2">
                <UserRound
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  ref={firstNameInputRef}
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onBlur={() => setFirstNameTouched(true)}
                  className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="First name"
                  required
                  disabled={isLoading}
                  maxLength={50}
                />
              </div>
            </div>
            {/* Username Preview - Always visible */}
            <div className="min-h-[18px] ml-1">
              {usernamePreview ? (
                <p className="text-[10px] text-gray-600">
                  Username:{' '}
                  <span className="font-mono font-semibold text-blue-700">{usernamePreview}</span>
                </p>
              ) : (
                <p className="text-[10px] text-gray-400">Username:</p>
              )}
            </div>
          </div>

          {/* Last Name */}
          <div
            className={`auth-input-container ${getFieldBorderClass(lastNameTouched, lastName.trim().length > 0)}`}
          >
            <label
              htmlFor="lastName"
              className={`absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium transition-colors ${getLabelColorClass(lastNameTouched, lastName.trim().length > 0)}`}
            >
              Last name <span className="text-red-500">*</span>
            </label>
            <div className="relative px-3 py-2">
              <UserRound
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                size={16}
              />
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onBlur={() => setLastNameTouched(true)}
                className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                placeholder="Last name"
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>
          </div>
        </div>

        {/* Contact & Work Info Group */}
        <div className="space-y-2">
          {/* Email */}
          <div className="space-y-1">
            <div
              className={`auth-input-container ${emailError ? 'input-field-error' : getFieldBorderClass(emailTouched, emailIsValid)}`}
            >
              <label
                htmlFor="email"
                className={`absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium transition-colors ${emailError ? 'text-validation-error-label' : getLabelColorClass(emailTouched, emailIsValid)}`}
              >
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative px-3 py-2">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setEmailError(null); // Clear error when user types
                  }}
                  onBlur={e => {
                    setEmail(e.target.value.trim());
                    setEmailTouched(true);
                  }}
                  className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="name@institution.edu"
                  required
                  disabled={isLoading}
                  maxLength={255}
                />
              </div>
            </div>
            {/* Email error message */}
            {emailError && (
              <p className="text-[11px] text-validation-error-helper ml-1">{emailError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            {/* Department */}
            <div className="auth-input-container border-slate-200">
              <label
                htmlFor="department"
                className="absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium text-slate-400"
              >
                Department
              </label>
              <div className="relative px-3 py-2">
                <Building2
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  type="text"
                  id="department"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="Department name"
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Position */}
            <div className="auth-input-container border-slate-200">
              <label
                htmlFor="position"
                className="absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium text-slate-400"
              >
                Position
              </label>
              <div className="relative px-3 py-2">
                <BriefcaseBusiness
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  type="text"
                  id="position"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="pl-7 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="Title or role"
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Researcher Profile Toggle */}
          <div className="ml-1">
            <label className="flex items-center space-x-1.5 cursor-pointer group">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={createResearcher}
                  onChange={e => setCreateResearcher(e.target.checked)}
                  disabled={isLoading}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-action peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </div>
              <span className="text-xs text-gray-700 group-hover:text-gray-900">
                I am a researcher
              </span>
            </label>
          </div>
        </div>

        {/* Password Fields Group */}
        <div className="pt-3 border-t border-border space-y-2">
          <div>
            <div
              className={`auth-input-container ${getFieldBorderClass(passwordTouched, passwordMeetsRequirements)}`}
            >
              <label
                htmlFor="password"
                className={`absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium transition-colors ${getLabelColorClass(passwordTouched, passwordMeetsRequirements)}`}
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative px-3 py-2">
                <KeyRound
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className="pl-7 pr-8 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="Choose a secure password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 rounded focus-enhanced"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Requirements - Always visible */}
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
          <div>
            <div
              className={`auth-input-container ${getFieldBorderClass(!!confirmPassword, password === confirmPassword)}`}
            >
              <label
                htmlFor="confirmPassword"
                className={`absolute -top-2 left-3 bg-surface px-1 text-[10px] font-medium transition-colors ${getLabelColorClass(!!confirmPassword, password === confirmPassword)}`}
              >
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative px-3 py-2">
                <KeyRound
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                  size={16}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-7 pr-8 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                  placeholder="Confirm password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 rounded focus-enhanced"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn btn-primary h-12 text-base font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2.5"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating your account...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 border-l-4 border-l-slate-400 rounded-lg shadow-sm">
        <Info size={16} className="text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-600">
          New users require admin approval before accessing the system.
        </p>
      </div>

      {onSwitchToLogin && (
        <div className="mt-4 text-center">
          <p className="text-xs text-text-muted">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-action-hover font-semibold hover:text-[#3d6a99] transition-colors focus-enhanced rounded px-1"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </AuthBaseModal>
  );
}
