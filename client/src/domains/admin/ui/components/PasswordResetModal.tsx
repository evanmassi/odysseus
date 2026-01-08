/**
 * Password Reset Modal - Admin password reset with two methods:
 * 1. Direct reset - Admin sets password immediately
 * 2. Token generation - Generate 15-minute one-time link for user
 */

import { useState } from 'react';

import { KeyRound, Eye, EyeOff, Copy, Check, RotateCcwKey, ExternalLink } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils/notifications';

import { adminService } from '../../services/AdminService';

interface PasswordResetModalProps {
  userId: string;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  userId,
  username,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'token'>('direct');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    if (strength === 'Too short' || strength === 'Weak') return 'text-red-600';
    if (strength === 'Medium') return 'text-yellow-600';
    if (strength === 'Strong') return 'text-green-600';
    return '';
  };

  const tabs = (
    <div className="flex items-center gap-6 px-4">
      <button
        type="button"
        onClick={() => setActiveTab('direct')}
        data-focus="none"
        className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-slate-100 border-b-2 -mb-px ${
          activeTab === 'direct'
            ? 'border-slate-600 text-slate-800'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        }`}
      >
        <RotateCcwKey size={14} />
        Set Password
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('token')}
        data-focus="none"
        className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-slate-100 border-b-2 -mb-px ${
          activeTab === 'token'
            ? 'border-slate-600 text-slate-800'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        }`}
      >
        <ExternalLink size={14} />
        Generate Link
      </button>
    </div>
  );

  return (
    <BaseModal
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
            <p className="text-sm text-slate-600 mb-6">
              User: <span className="font-bold text-action-hover">{username}</span>
            </p>

            {/* Password Input */}
            <div className="mb-4">
              <div
                className={`auth-input-container ${
                  newPassword.length >= 4 ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <label
                  htmlFor="newPassword"
                  className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                    newPassword.length >= 4 ? 'text-green-700' : 'text-gray-700'
                  }`}
                >
                  Temporary Password
                </label>
                <div className="relative px-3 py-2">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="pr-8 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                    placeholder="Enter temporary password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 rounded focus-ring-default"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {newPassword && (
                <p className={`text-xs mt-1 ml-1 ${getPasswordStrengthColor(newPassword)}`}>
                  Strength: {getPasswordStrength(newPassword)}
                </p>
              )}
            </div>

            {/* Require Password Change Toggle */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePasswordChange}
                    onChange={e => setRequirePasswordChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-action"></div>
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Require password change on next login
                </span>
              </label>
            </div>

            {/* Reset Button */}
            <div className="mt-auto">
              <button
                onClick={handleDirectReset}
                disabled={isLoading || !newPassword}
                className="w-full btn btn-primary h-11 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {!resetUrl ? (
              <div className="flex-1 flex flex-col">
                <p className="text-sm text-slate-600 mb-4">
                  User: <span className="font-bold text-action-hover">{username}</span>
                </p>
                <p className="text-sm text-slate-600 mb-4">
                  Creates a secure, one-time link that expires in 15 minutes.
                </p>
                <div className="mt-auto">
                  <button
                    onClick={handleGenerateToken}
                    disabled={isLoading}
                    className="w-full btn btn-primary h-11 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Generating...' : 'Generate Reset Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Reset Link Generated</p>
                <div className="bg-slate-100 p-3 rounded-md mb-3 break-all text-sm">{resetUrl}</div>
                <button
                  onClick={handleCopyUrl}
                  className="w-full btn btn-primary h-11 text-base font-semibold flex items-center justify-center gap-2 mb-3"
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy Link
                    </>
                  )}
                </button>
                {expiresAt && (
                  <p className="text-xs text-slate-600 text-center">
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-3">
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
