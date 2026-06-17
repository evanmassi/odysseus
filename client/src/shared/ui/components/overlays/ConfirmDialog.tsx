/**
 * Confirmation Dialog
 *
 * Danger/warning confirmation with keyboard navigation and focus trap.
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';

import { X } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAnimatedClose, useFocusTrap } from '@shared/hooks';
import { AnimatedWarningMark } from '@shared/ui/components/icons/AnimatedWarningMark';
import { AnimatedXMark } from '@shared/ui/components/icons/AnimatedXMark';

import { Button, NubDivider, ScrimHalo, type ButtonVariant } from '../../primitives';

import { ModalPortal } from './ModalPortal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  variant: 'danger' | 'warning';
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

function getVariantStyles(variant: 'danger' | 'warning') {
  if (variant === 'danger') {
    return {
      iconColor: 'text-danger-text',
      pin: 'bg-danger-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-danger-bg)/0.7)]',
      buttonVariant: 'danger' as ButtonVariant,
      Mark: AnimatedXMark,
    };
  }

  return {
    iconColor: 'text-warning-text',
    pin: 'bg-warning-bg dark:shadow-[0_0_6px_1px_hsl(var(--color-warning-bg)/0.7)]',
    buttonVariant: 'warning' as ButtonVariant,
    Mark: AnimatedWarningMark,
  };
}

const EXIT_DURATION = 200;

export function ConfirmDialog({
  isOpen,
  variant,
  title,
  message,
  confirmText = 'Confirm',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const modalService = useModalStore();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const styles = getVariantStyles(variant);
  const MarkComponent = styles.Mark;

  const { isVisible, isClosing, triggerClose } = useAnimatedClose({
    isOpen,
    onClose: onCancel,
    exitDuration: EXIT_DURATION,
  });

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      triggerClose();
    }
  }, [isLoading, triggerClose]);

  const handleConfirm = useCallback(() => {
    if (!isLoading) {
      onConfirm();
    }
  }, [isLoading, onConfirm]);

  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: confirmButtonRef,
    autoFocusFirstInput: false,
  });

  useEffect(() => {
    if (!isVisible) return;

    return () => {
      const modalType = variant === 'danger' ? 'deleteConfirm' : 'overwriteConfirm';
      const previousFocus = modalService[modalType].previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [isVisible, modalService, variant]);

  // Disabled during exit animation to prevent double-triggers
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.key === 'Escape' && !isLoading) {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible, isClosing, handleConfirm, handleCancel, isLoading]);

  if (!isVisible) return null;

  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const modalAnimationClass = isClosing ? 'animate-modal-blowup-out' : 'animate-modal-blowup-in';

  // During exit animation, disable interactions so clicks reach dashboard
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
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
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
                id="confirm-dialog-title"
                className="phosphor-text font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-tooltip-foreground"
              >
                {title}
              </h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-tooltip-muted transition-colors hover:text-tooltip-foreground disabled:opacity-50"
              aria-label="Close dialog"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <NubDivider tone="neutral" className="relative my-4" />

          {/* Message */}
          <p
            id="confirm-dialog-message"
            className="mb-7 text-sm leading-relaxed text-tooltip-foreground/80"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              ref={confirmButtonRef}
              variant={styles.buttonVariant}
              onClick={handleConfirm}
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Processing..."
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
