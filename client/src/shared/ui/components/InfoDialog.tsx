/**
 * InfoDialog - Single-button acknowledgment dialog
 *
 * For situations requiring acknowledgment but not a decision (e.g., "Tube Not Found").
 * Shares visual pattern with ConfirmDialog: blowup animation, focus trap, keyboard support.
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';

import { X, AlertTriangle, Info } from 'lucide-react';

import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

export interface InfoDialogProps {
  isOpen: boolean;
  variant: 'warning' | 'info';
  title: string;
  /** Supports React elements for rich formatting */
  message: ReactNode;
  buttonText?: string;
  onClose: () => void;
}

function getVariantStyles(variant: 'warning' | 'info') {
  if (variant === 'warning') {
    return {
      iconBg: 'bg-warning-light',
      iconColor: 'text-warning-bg',
      border: 'border-warning-border',
      shadowColor: 'var(--color-warning-bg)',
      buttonClass: 'btn btn-secondary',
      Icon: AlertTriangle,
    };
  }

  return {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'border-blue-200',
    shadowColor: 'rgb(37 99 235)',
    buttonClass: 'btn btn-secondary',
    Icon: Info,
  };
}

const EXIT_DURATION_MS = 200;

export function InfoDialog({
  isOpen,
  variant,
  title,
  message,
  buttonText = 'Close',
  onClose,
}: InfoDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const styles = getVariantStyles(variant);
  const IconComponent = styles.Icon;

  const { isVisible, isClosing, triggerClose } = useAnimatedClose({
    isOpen,
    onClose,
    exitDuration: EXIT_DURATION_MS,
  });

  const handleClose = useCallback(() => {
    triggerClose();
  }, [triggerClose]);

  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: closeButtonRef,
    autoFocusFirstInput: false,
  });

  // Enter/Escape both dismiss - disabled during exit to prevent double-triggers
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible, isClosing, handleClose]);

  if (!isVisible) return null;

  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const modalAnimationClass = isClosing ? 'animate-modal-blowup-out' : 'animate-modal-blowup-in';
  const closingPointerEvents = isClosing ? 'pointer-events-none' : '';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 ${backdropAnimationClass} ${closingPointerEvents}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="info-dialog-title"
          aria-describedby="info-dialog-message"
          className={`bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border ${styles.border} ${modalAnimationClass} ${closingPointerEvents}`}
          style={{ '--tw-shadow-color': styles.shadowColor } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${styles.iconBg} rounded-full`}>
                <IconComponent className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
              <h2 id="info-dialog-title" className="text-xl font-bold text-dark">
                {title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-dark transition-all duration-200 focus-ring-default"
              aria-label="Close dialog"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8">
            <p id="info-dialog-message" className="text-text-muted leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex justify-end">
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className={`${styles.buttonClass} px-6`}
              type="button"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
