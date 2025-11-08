/**
 * RegistrationSuccessModal - Post-registration confirmation
 *
 * Professional confirmation modal shown after successful registration.
 * Clearly displays username, account status, and next steps.
 *
 * Inspired by enterprise biotech apps (Benchling, LabArchives).
 */

import React, { useState } from 'react';

import { CheckCircle, Copy, Check, Mail, Clock } from 'lucide-react';

import { useFocusTrap } from '@shared/hooks/useFocusTrap';

export interface RegistrationSuccessModalProps {
  username: string;
  email: string;
  status: 'approved' | 'pending';
  onClose: () => void;
}

export function RegistrationSuccessModal({
  username,
  email,
  status,
  onClose
}: RegistrationSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  // Focus trap for keyboard accessibility
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true
  });

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-[60] animate-in fade-in duration-150">
      <div ref={trapRef} className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-blue-500/20 border border-odysseus-border animate-zoom-in-95">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-odysseus-dark">
            Account Created Successfully
          </h2>
        </div>

        {/* Username Display with Copy */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
            Your Username
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="flex-1 font-mono text-base font-semibold text-odysseus-dark">
              {username}
            </span>
            <button
              onClick={handleCopyUsername}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-odysseus-primary hover:text-odysseus-accent hover:bg-info-light rounded transition-colors"
              type="button"
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
          <p className="text-xs text-gray-600 mt-2">
            Please save this username for future login
          </p>
        </div>

        {/* Status Information */}
        <div className="space-y-3 mb-6">
          {isPending ? (
            <>
              {/* Email Verification Required - Not currently implemented */}
              {/* <div className="alert-info flex items-start gap-3">
                <Mail className="w-5 h-5 alert-info-icon flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="alert-info-heading mb-1">
                    Step 1: Verify Your Email
                  </h3>
                  <p className="alert-info-text leading-relaxed">
                    We've sent a verification link to <span className="font-medium">{email}</span>. Please check your inbox and click the link to verify your email address.
                  </p>
                </div>
              </div> */}

              {/* Pending Admin Approval */}
              <div className="alert-warning flex items-start gap-3">
                <Clock className="w-5 h-5 alert-warning-icon flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="alert-warning-heading mb-1">
                    Administrator Approval Required
                  </h3>
                  <p className="alert-warning-text leading-relaxed">
                    An administrator will review your account. You'll be notified when approved.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Approved Status (First User) */
            <div className="alert-success flex items-start gap-3">
              <CheckCircle className="w-5 h-5 alert-success-icon flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="alert-success-heading mb-1">
                  Account Approved
                </h3>
                <p className="alert-success-text leading-relaxed">
                  You're all set! You can now log in with your username and password.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full btn btn-primary h-12 text-base font-bold shadow-lg"
          type="button"
        >
          {isPending ? 'Close and Return to Login' : 'Continue to Login'}
        </button>

        {/* Footer Note */}
        {isPending && (
          <p className="text-xs text-center text-gray-500 mt-4">
            You can close this window. We'll notify you when your account is ready.
          </p>
        )}
      </div>
    </div>
  );
}
