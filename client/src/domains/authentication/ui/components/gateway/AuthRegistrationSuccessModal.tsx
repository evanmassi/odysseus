/**
 * Registration Success Confirmation
 *
 * Displays username, account status, and next steps after registration.
 */

import { useState } from 'react';

import { Copy, Check } from 'lucide-react';

import { AlertBanner, Button } from '@shared/ui';
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
      <div className="flex justify-center mb-3">
        <AnimatedCheckmark size={64} className="text-success-text" delay={750} />
      </div>
      <div className="text-center mb-6">
        <h2 className="font-mono text-base text-success-text phosphor-text mb-1">
          Account Created
        </h2>
        <p className="font-mono text-xs text-[rgb(var(--auth-text-mute))]">Ready to sign in</p>
      </div>

      <div className="mb-6">
        <div className="auth-input-console state-default">
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
        <p className="font-mono text-[10px] text-[rgb(var(--auth-text-faint))] mt-2 ml-1">
          Save this username for future login
        </p>
      </div>

      <div className="mb-6">
        <AlertBanner variant="info" spacing="none" className="text-xs">
          You&apos;re all set. Sign in with your username and password.
        </AlertBanner>
      </div>

      <Button variant="primary" marker="bar" tail ceremonial fullWidth onClick={onClose}>
        Continue
      </Button>
    </div>
  );
}
