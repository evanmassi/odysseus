/**
 * Info Dialog
 *
 * Single-button acknowledgment dialog for non-decision situations
 */
import { useEffect, useRef, useCallback, type ReactNode } from 'react';

import { X } from 'lucide-react';

import { AnimatedInfoMark } from '@shared/components/AnimatedInfoMark';
import { AnimatedWarningMark } from '@shared/components/AnimatedWarningMark';
import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

import { Button } from '../primitives';

import { ModalPortal } from './ModalPortal';

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
      iconColor: 'text-warning-text',
      shadowColor: 'hsl(var(--color-warning-bg))',
      Mark: AnimatedWarningMark,
    };
  }

  return {
    iconColor: 'text-info-text',
    shadowColor: 'hsl(var(--color-info-bg))',
    Mark: AnimatedInfoMark,
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
  const MarkComponent = styles.Mark;

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
        className={`fixed inset-0 bg-[hsl(var(--overlay-emphasis))] flex items-center justify-center z-50 ${backdropAnimationClass} ${closingPointerEvents}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="info-dialog-title"
          aria-describedby="info-dialog-message"
          className={`bg-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-border ${modalAnimationClass} ${closingPointerEvents}`}
          style={{ '--tw-shadow-color': styles.shadowColor } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <MarkComponent size={24} className={styles.iconColor} />
              <h2 id="info-dialog-title" className="text-xl font-bold text-card-foreground">
                {title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-200"
              aria-label="Close dialog"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8">
            <p id="info-dialog-message" className="text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex justify-end">
            <Button ref={closeButtonRef} variant="secondary" onClick={handleClose}>
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
