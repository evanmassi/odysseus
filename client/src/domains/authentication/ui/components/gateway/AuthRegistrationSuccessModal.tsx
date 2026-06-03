/**
 * Registration Success Confirmation
 *
 * Displays username, account status, and next steps after registration.
 */

import { useState } from 'react';

import { Copy, Check } from 'lucide-react';

import { Button } from '@shared/ui';
import { AnimatedCheckmark } from '@shared/ui/components/icons/AnimatedCheckmark';

export interface AuthRegistrationSuccessModalProps {
  username: string;
  onClose: () => void;
}

export function AuthRegistrationSuccessModal({
  username,
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

  return (
    <div key="registration-success" className="animate-auth-stack">
      <div className="flex items-center gap-2.5 mb-6">
        <AnimatedCheckmark size={28} className="text-success-text phosphor-glow" delay={250} />
        <h2 className="text-base font-semibold text-success-text phosphor-text">Account Created</h2>
      </div>

      <div className="auth-microheader mb-6">
        <span className="auth-microheader-bar" />
        <span className="phosphor-text">[ Ready to sign in ]</span>
        <span className="auth-microheader-rule" />
      </div>

      <div className="mb-6">
        <div className="auth-input-console state-success">
          <span className="auth-input-console__label">Your username</span>
          <div className="auth-input-console__field">
            <span
              className="flex-1 px-3 py-2.5 font-mono text-sm text-[rgb(var(--auth-text))] truncate"
              role="status"
              aria-label={`Your username is ${username}`}
            >
              {username}
            </span>
            <button
              onClick={handleCopyUsername}
              className="flex items-center gap-1.5 px-3 h-full text-[rgb(var(--auth-text-mute))] hover:text-[rgb(var(--auth-text))] transition-colors font-mono text-xs border-l border-[rgb(var(--auth-divider))]"
              type="button"
              aria-label={`Copy username ${username}`}
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
      </div>

      <Button variant="primary" tail ceremonial fullWidth onClick={onClose}>
        Continue
      </Button>
    </div>
  );
}
