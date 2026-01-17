/**
 * Password Reset Modal - Admin password reset with two methods:
 * 1. Direct reset - Admin sets password immediately
 * 2. Token generation - Generate 15-minute one-time link for user
 */

import { useState, useEffect } from 'react';

import { KeyRound, Copy, Check, RotateCcwKey, ExternalLink } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { AuthInput, Button, Tab, Tabs, Toggle } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils/notifications';

import { adminService } from '../../services/AdminService';

interface PasswordResetModalProps {
  isOpen: boolean;
  userId: string;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  userId,
  username,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'token'>('direct');
  const [newPassword, setNewPassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleDirectReset = async () => {
    if (!newPassword || newPassword.length < 4) {
      notifications.error('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    try {
      await adminService.resetUserPassword(userId, newPassword, requirePasswordChange);
      notifications.success('Password reset successfully');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      notifications.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setIsLoading(true);
    try {
      const response = await adminService.generatePasswordResetToken(userId);
      setResetUrl(response.resetUrl);
      setExpiresAt(response.expiresAt);
      notifications.success('Reset link generated successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate reset link';
      notifications.error(message);
    } finally {
      setIsLoading(false);
    }
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

  const getPasswordStrength = (password: string): string => {
    if (password.length === 0) return '';
    if (password.length < 4) return 'Too short';
    if (password.length < 8) return 'Weak';
    if (password.length < 12) return 'Medium';
    return 'Strong';
  };

  const getPasswordStrengthColor = (password: string): string => {
    const strength = getPasswordStrength(password);
    if (strength === 'Too short' || strength === 'Weak') return 'text-danger-text';
    if (strength === 'Medium') return 'text-warning-text';
    if (strength === 'Strong') return 'text-success-text';
    return '';
  };

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

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<KeyRound size={20} />}
      title="Reset Password"
      size="sm"
      animation="slide"
      tabs={tabs}
      tabOrientation="horizontal"
      onClose={onClose}
    >
      {/* Tab Content - Fixed height to prevent shifting */}
      <div className="min-h-[200px] flex flex-col">
        {activeTab === 'direct' ? (
          <div className="flex-1 flex flex-col">
            {/* User Info */}
            <p className="text-sm text-secondary-foreground mb-6">
              User: <span className="font-bold text-action-hover">{username}</span>
            </p>

            {/* Password Input */}
            <div className="mb-4">
              <AuthInput
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                label="Temporary Password"
                placeholder="Enter temporary password"
                state={newPassword.length >= 4 ? 'success' : 'default'}
              />
              {newPassword && (
                <p className={`text-xs mt-1 ml-1 ${getPasswordStrengthColor(newPassword)}`}>
                  Strength: {getPasswordStrength(newPassword)}
                </p>
              )}
            </div>

            {/* Require Password Change Toggle */}
            <div className="mb-4 flex items-center space-x-2 group">
              <Toggle
                checked={requirePasswordChange}
                onChange={setRequirePasswordChange}
                size="sm"
                aria-label="Require password change on next login"
              />
              <span className="text-sm text-secondary-foreground group-hover:text-accent-foreground cursor-default">
                Require password change on next login
              </span>
            </div>

            {/* Reset Button */}
            <div className="mt-auto">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleDirectReset}
                disabled={!newPassword}
                isLoading={isLoading}
                loadingText="Resetting..."
              >
                Reset Password
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {!resetUrl ? (
              <div className="flex-1 flex flex-col">
                <p className="text-sm text-secondary-foreground mb-4">
                  User: <span className="font-bold text-action-hover">{username}</span>
                </p>
                <p className="text-sm text-secondary-foreground mb-4">
                  Creates a secure, one-time link that expires in 15 minutes.
                </p>
                <div className="mt-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleGenerateToken}
                    isLoading={isLoading}
                    loadingText="Generating..."
                  >
                    Generate Reset Link
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-secondary-foreground mb-2">
                  Reset Link Generated
                </p>
                <div className="bg-muted p-3 rounded-md mb-3 break-all text-sm">{resetUrl}</div>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCopyUrl}
                  leftIcon={copied ? <Check size={18} /> : <Copy size={18} />}
                  className="mb-3"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                {expiresAt && (
                  <p className="text-xs text-secondary-foreground text-center">
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-secondary-foreground mt-3">
                  Share this link with the user. They can use it once to set a new password.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
