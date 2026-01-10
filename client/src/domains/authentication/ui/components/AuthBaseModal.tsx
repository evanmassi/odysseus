/**
 * AuthBaseModal - Shared layout wrapper for authentication modals
 *
 * Provides consistent backdrop, card styling, animations, focus trap,
 * and optional branding header across all auth modals.
 */

import { type ReactNode, type RefObject } from 'react';

import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import odysseusLogo from '@shared/assets/odysseus-logo-thick-altered.svg';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

export interface AuthBaseModalProps {
  children: ReactNode;
  /** Modal width: 'default' (max-w-md) or 'large' (max-w-lg) */
  size?: 'default' | 'large';
  /** Branding header mode: true (icon + logo), 'icon' (icon only), false (no header) */
  showBranding?: boolean | 'icon';
  /** Subtitle text below branding (works with showBranding true or 'icon') */
  subtitle?: string;
  /** Reference to element that should receive initial focus */
  initialFocusRef?: RefObject<HTMLElement>;
  /** z-index override for nested modals */
  zIndex?: 50 | 60;
  /** Additional CSS classes for the modal card */
  className?: string;
}

export function AuthBaseModal({
  children,
  size = 'default',
  showBranding = true,
  subtitle,
  initialFocusRef,
  zIndex = 50,
  className = '',
}: AuthBaseModalProps) {
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
    initialFocusRef,
  });

  const sizeClasses = size === 'large' ? 'max-w-lg p-6' : 'max-w-md p-8';
  const zIndexClass = zIndex === 60 ? 'z-[60]' : 'z-50';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center ${zIndexClass} animate-modal-backdrop`}
      >
        <div
          ref={trapRef}
          className={`bg-odysseus-surface rounded-2xl w-full ${sizeClasses} mx-4 shadow-2xl shadow-black/10 animate-modal-auth ${className}`}
        >
          {showBranding && (
            <div className="text-center mb-4">
              <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
                <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
              </div>
              {showBranding === true && (
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <img src={odysseusLogo} alt="Odysseus" className="h-10 w-auto" />
                </div>
              )}
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          )}

          {children}
        </div>
      </div>
    </ModalPortal>
  );
}
