/**
 * Password Reset Modal
 *
 * Admin resets a user's password directly, or generates a one-time reset link.
 */

import { useState, useEffect, useMemo } from 'react';

import { PasswordValidator } from '@odysseus/shared-schemas';
import { KeyRound, Copy, Check, RotateCcwKey, ExternalLink, Clock, RotateCcw } from 'lucide-react';

import { usePasswordRequirementsQuery } from '@domains/authentication';
import { logger } from '@infra/logger';
import { AccentTick, AuthInput, Button, Tab, Tabs, Toggle } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { notifications } from '@shared/utils/notifications';

import {
  useGeneratePasswordResetTokenMutation,
  useResetUserPasswordMutation,
} from '../../../hooks/useUserMutations';

interface PasswordStrength {
  label: string;
  level: number;
  textClass: string;
  barClass: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { label: '', level: 0, textClass: '', barClass: '' };
  if (password.length < 8) {
    return {
      label: password.length < 4 ? 'Too short' : 'Weak',
      level: 1,
      textClass: 'text-danger-text',
      barClass: 'bg-danger-bg',
    };
  }
  if (password.length < 12) {
    return { label: 'Medium', level: 2, textClass: 'text-warning-text', barClass: 'bg-warning-bg' };
  }
  return { label: 'Strong', level: 3, textClass: 'text-success-text', barClass: 'bg-success-bg' };
}

interface PasswordResetModalProps {
  isOpen: boolean;
  userId: string;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordResetModal({
  isOpen,
  userId,
  username,
  onClose,
  onSuccess,
}: PasswordResetModalProps) {
  const [activeTab, setActiveTab] = useState<'direct' | 'token'>('direct');
  const [newPassword, setNewPassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: passwordRequirements } = usePasswordRequirementsQuery();
  const resetPasswordMutation = useResetUserPasswordMutation();
  const generateTokenMutation = useGeneratePasswordResetTokenMutation();

  const meetsRequirements = useMemo(() => {
    if (!passwordRequirements || !newPassword) return false;
    return PasswordValidator.validate(newPassword, passwordRequirements).isValid;
  }, [newPassword, passwordRequirements]);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('direct');
      setNewPassword('');
      setRequirePasswordChange(true);
      setResetUrl(null);
      setExpiresAt(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleDirectReset = () => {
    if (!newPassword) {
      notifications.error('Password is required');
      return;
    }

    if (passwordRequirements && !meetsRequirements) {
      const unmet = PasswordValidator.validate(newPassword, passwordRequirements).requirements.find(
        req => !req.isMet
      );
      notifications.error(unmet ? `Password must have ${unmet.label}` : 'Password is too weak');
      return;
    }

    resetPasswordMutation.mutate(
      { userId, newPassword, requirePasswordChange },
      {
        onSuccess: () => {
          notifications.success('Password reset successfully');
          onSuccess();
          onClose();
        },
      }
    );
  };

  const handleGenerateToken = () => {
    generateTokenMutation.mutate(userId, {
      onSuccess: response => {
        setResetUrl(response.resetUrl);
        setExpiresAt(response.expiresAt);
        notifications.success('Reset link generated successfully');
      },
    });
  };

  const handleCopyUrl = () => {
    if (resetUrl) {
      void (async () => {
        try {
          await navigator.clipboard.writeText(resetUrl);
          setCopied(true);
          notifications.success('Reset link copied to clipboard');
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          logger.error('Failed to copy to clipboard', { error });
          notifications.error('Failed to copy link. Please copy manually.');
        }
      })();
    }
  };

  const {
    label: strengthLabel,
    level: strengthLevel,
    barClass: strengthBar,
    textClass: strengthText,
  } = getPasswordStrength(newPassword);

  const tabs = (
    <Tabs value={activeTab} onChange={v => setActiveTab(v as 'direct' | 'token')}>
      <Tab id="direct" icon={<RotateCcwKey size={14} />}>
        Set Password
      </Tab>
      <Tab id="token" icon={<ExternalLink size={14} />}>
        Generate Link
      </Tab>
    </Tabs>
  );

  const footer =
    activeTab === 'direct' ? (
      <Button
        variant="primary"
        tail
        fullWidth
        onClick={handleDirectReset}
        disabled={!newPassword}
        isLoading={resetPasswordMutation.isPending}
        loadingText="Resetting..."
      >
        Reset Password
      </Button>
    ) : !resetUrl ? (
      <Button
        variant="primary"
        tail
        fullWidth
        onClick={handleGenerateToken}
        isLoading={generateTokenMutation.isPending}
        loadingText="Generating..."
      >
        Generate Reset Link
      </Button>
    ) : (
      <Button variant="primary" tail fullWidth onClick={onClose}>
        Done
      </Button>
    );

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<KeyRound size={20} />}
      title="Reset Password"
      size="sm"
      chassis="lit"
      contentClassName="p-5"
      tabs={tabs}
      tabOrientation="horizontal"
      footer={footer}
      locator={
        <div className="flex items-center gap-2.5">
          <AccentTick />
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            User
          </span>
          <span className="font-mono text-data-sm text-secondary-foreground phosphor-text">
            {username}
          </span>
        </div>
      }
      onClose={onClose}
    >
      {/* Fixed height so switching tabs or generating a link never resizes the modal */}
      <div className="h-[110px]">
        {activeTab === 'direct' ? (
          <div>
            {/* Password Input */}
            <div className="mb-4">
              <AuthInput
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                label="Temporary Password"
                placeholder="Enter temporary password"
                icon={<KeyRound size={16} />}
                state={meetsRequirements ? 'success' : 'default'}
                variant="console"
              />
              <div className="mt-2 ml-1 flex items-center gap-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className={`h-1 w-7 transition-colors ${
                        i < strengthLevel ? strengthBar : 'bg-foreground/15'
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`text-caption ${newPassword ? strengthText : 'text-muted-foreground/50'}`}
                >
                  {strengthLabel || '—'}
                </span>
              </div>
            </div>

            {/* Require Password Change Toggle */}
            <div className="flex items-center justify-end gap-2.5">
              <span className="text-body-sm text-secondary-foreground">
                Require password change on next login
              </span>
              <Toggle
                checked={requirePasswordChange}
                onChange={setRequirePasswordChange}
                size="sm"
                className="leading-none"
                aria-label="Require password change on next login"
              />
            </div>
          </div>
        ) : !resetUrl ? (
          <div>
            <p className="text-body text-secondary-foreground">
              Creates a secure, one-time reset link.
            </p>
            <div className="mt-3 space-y-2 pl-5">
              {[
                { icon: <Clock size={14} />, label: 'Expires', value: '15 minutes' },
                {
                  icon: <RotateCcw size={14} />,
                  label: 'Uses',
                  value: 'Single use, then invalid',
                },
                { icon: <KeyRound size={14} />, label: 'Sets', value: "User's own password" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-primary phosphor-glow">{icon}</span>
                  <span className="w-14 type-label text-label-2xs text-primary phosphor-text">
                    {label}
                  </span>
                  <span className="text-body-sm text-secondary-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="auth-input-console state-default">
              <span className="auth-input-console__label">Reset link</span>
              <div className="auth-input-console__field">
                <span
                  className="flex-1 px-3 py-2.5 font-mono text-data text-foreground truncate"
                  role="status"
                  aria-label="Generated reset link"
                >
                  {resetUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1.5 px-3 h-full text-muted-foreground hover:text-foreground transition-colors font-mono text-data-sm border-l border-line-soft"
                  aria-label="Copy reset link"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {expiresAt && (
              <p className="text-caption text-secondary-foreground mt-2">
                Expires {new Date(expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
