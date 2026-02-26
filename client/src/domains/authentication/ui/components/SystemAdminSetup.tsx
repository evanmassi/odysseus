/**
 * System Admin Setup
 *
 * One-time setup screen for creating the initial system administrator.
 * Shown when no system admin exists (detected during bootstrap).
 */

import { useState, useRef, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { UserRound, KeyRound, Mail, ShieldCheck } from 'lucide-react';

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useAuthStore, sessionManager } from '@domains/authentication/stores/authStore';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, AuthInput, Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { AuthBaseModal } from './AuthBaseModal';

export function SystemAdminSetup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  const requireSetupKey = !!import.meta.env['VITE_REQUIRE_SETUP_KEY'];

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

    if (!username.trim() || !email.trim() || !password.trim()) {
      notifications.error('Please fill in all required fields');
      return;
    }

    if (!emailIsValid) {
      notifications.error('Please enter a valid email address');
      return;
    }

    if (!passwordIsValid) {
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
        username: username.trim(),
        password,
        email: email.trim(),
        setupKey: setupKey.trim() || undefined,
      });

      // Auto-login: store tokens and update auth state (same pattern as login/register)
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
      size="default"
      subtitle="System Administrator Setup"
      initialFocusRef={usernameRef}
    >
      <AlertBanner variant="info" spacing="none" className="text-xs mb-3">
        No system administrator exists yet. Create one to manage labs and global settings.
      </AlertBanner>

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthInput
          ref={usernameRef}
          id="sysadmin-username"
          value={username}
          onChange={setUsername}
          label="Username"
          placeholder="Choose a username"
          icon={<UserRound size={16} />}
          required
          disabled={isLoading}
          maxLength={50}
        />

        <AuthInput
          id="sysadmin-email"
          type="email"
          value={email}
          onChange={setEmail}
          label="Email"
          placeholder="admin@institution.edu"
          icon={<Mail size={16} />}
          required
          disabled={isLoading}
          maxLength={255}
        />

        <AuthInput
          id="sysadmin-password"
          type="password"
          value={password}
          onChange={setPassword}
          label="Password"
          placeholder="At least 8 characters"
          icon={<KeyRound size={16} />}
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
          required
          disabled={isLoading}
        />

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
