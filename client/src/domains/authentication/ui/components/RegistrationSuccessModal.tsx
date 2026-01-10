/**
 * RegistrationSuccessModal
 *
 * Confirmation modal shown after successful registration.
 * Displays username, account status, and next steps.
 */

import { useState } from 'react';

import { Copy, Check, Info } from 'lucide-react';

import { AnimatedCheckmark } from '@shared/components/AnimatedCheckmark';

import { AuthBaseModal } from './AuthBaseModal';

export interface RegistrationSuccessModalProps {
  username: string;
  status: 'approved' | 'pending';
  onClose: () => void;
}

export function RegistrationSuccessModal({
  username,
  status,
  onClose,
}: RegistrationSuccessModalProps) {
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
        <AnimatedCheckmark size={64} />
      </div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-emerald-600 mb-1">Account Created</h2>
        <p className="text-sm text-odysseus-muted">
          {isPending ? 'Awaiting admin approval' : 'Ready to sign in'}
        </p>
      </div>

      {/* Username Display with Copy */}
      <div className="mb-6">
        <div className="auth-input-container border-slate-200 relative">
          <span className="absolute -top-2 left-3 bg-odysseus-surface px-1 text-[10px] font-medium text-slate-400">
            Your username
          </span>
          <div className="flex items-center gap-2 px-3 py-2">
            <span
              className="flex-1 font-mono text-sm font-semibold text-odysseus-dark"
              role="status"
              aria-label={`Your username is ${username}`}
            >
              {username}
            </span>
            <button
              onClick={handleCopyUsername}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-action hover:text-action-hover rounded focus-enhanced transition-colors"
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
        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
          Please save this username for future login
        </p>
      </div>

      {/* Status Information */}
      <div className="mb-6">
        <div className="p-2 bg-slate-50 rounded-lg">
          <div className="flex items-start space-x-1.5">
            <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-snug">
              {isPending
                ? "An administrator will review your account. You'll be notified when approved."
                : "You're all set! You can now log in with your username and password."}
            </p>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full btn btn-primary h-12 text-base font-bold shadow-lg"
        type="button"
      >
        {isPending ? 'Return to Login' : 'Continue to Login'}
      </button>
    </AuthBaseModal>
  );
}
