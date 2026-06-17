/**
 * Info Dialog
 *
 * Single-button acknowledgment dialog for non-decision situations
 */
import { useEffect, useRef, type ReactNode } from 'react';

import { X } from 'lucide-react';

import { useAnimatedClose, useFocusTrap } from '@shared/hooks';
import { AnimatedInfoMark } from '@shared/ui/components/icons/AnimatedInfoMark';
import { AnimatedWarningMark } from '@shared/ui/components/icons/AnimatedWarningMark';

import { Button, NubDivider, ScrimHalo } from '../../primitives';

import { ModalPortal } from './ModalPortal';

export interface InfoDialogProps {
  isOpen: boolean;
  variant: 'warning' | 'info';
  title: string;
  message: ReactNode;
  buttonText?: string;
  onClose: () => void;
}

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

function getVariantStyles(variant: 'warning' | 'info') {
  if (variant === 'warning') {
    return {
      iconColor: 'text-warning-text',
      pin: 'bg-warning-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-warning-bg)/0.7)]',
      Mark: AnimatedWarningMark,
    };
  }

  return {
    iconColor: 'text-info-text',
    pin: 'bg-info-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-info-bg)/0.7)]',
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

  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: closeButtonRef,
    autoFocusFirstInput: false,
  });

  // Disabled during exit to prevent double-triggers
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        triggerClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible, isClosing, triggerClose]);

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
          data-theme="dark"
          className={`relative isolate mx-4 w-full max-w-md px-7 py-6 ${modalAnimationClass} ${closingPointerEvents}`}
        >
          <ScrimHalo />
          {CORNER_PINS.map(pos => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute h-0.5 w-2 ${styles.pin} ${pos}`}
            />
          ))}

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <MarkComponent size={22} className={styles.iconColor} />
              <h2
                id="info-dialog-title"
                className="phosphor-text font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-tooltip-foreground"
              >
                {title}
              </h2>
            </div>
            <button
              onClick={triggerClose}
              className="text-tooltip-muted transition-colors hover:text-tooltip-foreground"
              aria-label="Close dialog"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <NubDivider tone="neutral" className="relative my-4" />

          {/* Message */}
          <p
            id="info-dialog-message"
            className="mb-7 text-sm leading-relaxed text-tooltip-foreground/80"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex justify-end">
            <Button ref={closeButtonRef} variant="secondary" onClick={triggerClose}>
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
