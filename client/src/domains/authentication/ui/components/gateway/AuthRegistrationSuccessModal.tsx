/**
 * Registration Success Confirmation
 *
 * Displays username, account status, and next steps after registration.
 */

import { useState } from 'react';

import { Copy, Check } from 'lucide-react';

import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';
import { AlertBanner, Button } from '@shared/ui';

import { AuthBaseModal } from './AuthBaseModal';

export interface AuthRegistrationSuccessModalProps {
  username: string;
  status: 'approved' | 'pending';
  onClose: () => void;
}

export function AuthRegistrationSuccessModal({
  username,
  status,
  onClose,
}: AuthRegistrationSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = username;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPending = status === 'pending';

  return (
    <AuthBaseModal showBranding="icon" zIndex={60}>
      {/* Success Header */}
      <div className="flex justify-center mb-2">
        <AnimatedCheckmark size={64} className="text-success-text" delay={750} />
      </div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-success-text mb-1">Account Created</h2>
        <p className="text-sm text-muted-foreground">
          {isPending ? 'Awaiting admin approval' : 'Ready to sign in'}
        </p>
      </div>

      {/* Username Display with Copy */}
      <div className="mb-6">
        <div className="auth-input-container border-border relative">
          <span className="absolute -top-2 left-3 bg-card px-1 text-[10px] font-medium text-muted-foreground">
            Your username
          </span>
          <div className="flex items-center gap-2 px-3 py-2">
            <span
              className="flex-1 font-mono text-sm font-semibold text-card-foreground"
              role="status"
              aria-label={`Your username is ${username}`}
            >
              {username}
            </span>
            <button
              onClick={handleCopyUsername}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-action [[data-theme=dark]_&]:text-action/70 hover:text-action-hover [[data-theme=dark]_&]:hover:text-action/90 rounded transition-colors"
              type="button"
              aria-label={`Copy username ${username}`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
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
        <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
          Please save this username for future login
        </p>
      </div>

      {/* Status Information */}
      <div className="mb-6">
        <AlertBanner variant="info" spacing="none" className="text-xs">
          {isPending
            ? "An administrator will review your account. You'll be notified when approved."
            : "You're all set! You can now log in with your username and password."}
        </AlertBanner>
      </div>

      {/* Close Button */}
      <Button
        variant="primary"
        size="xl"
        fullWidth
        onClick={onClose}
        className="shadow-lg font-bold"
      >
        {isPending ? 'Return to Login' : 'Continue to Login'}
      </Button>
    </AuthBaseModal>
  );
}
