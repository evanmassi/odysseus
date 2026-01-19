/**
 * ConfirmDialog - Unified Confirmation Dialog Component
 *
 * Confirmation dialog with keyboard navigation and accessibility.
 * Supports danger (delete) and warning (overwrite) variants.
 *
 * Features:
 * - Auto-focus on confirm button for immediate Enter confirmation
 * - Keyboard support: Enter confirms, Escape cancels, Tab cycles
 * - Focus trap prevents Tab from escaping dialog
 * - ARIA alertdialog role for urgent/destructive actions
 * - Multiple cancel methods: X button, Cancel button, Escape key
 *
 * @example
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   variant="danger"
 *   title="Delete Tube"
 *   message="Are you sure you want to delete this tube?"
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 *   onCancel={handleCancel}
 * />
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

import { Button, type ButtonVariant } from '../primitives';

export interface ConfirmDialogProps {
  /** Whether dialog is visible */
  isOpen: boolean;

  /** Visual variant - determines colors and styling */
  variant: 'danger' | 'warning';

  /** Dialog title */
  title: string;

  /** Confirmation message - can include React elements for formatting */
  message: ReactNode;

  /** Text for confirm button (e.g., "Delete", "Overwrite") */
  confirmText?: string;

  /** Callback when user confirms */
  onConfirm: () => void;

  /** Callback when user cancels (X, Cancel button, or Escape) */
  onCancel: () => void;

  /** Loading state - disables buttons and shows spinner */
  isLoading?: boolean;
}

/**
 * Get variant-specific styling
 * Shadow colors use CSS variables from the design system
 */
function getVariantStyles(variant: 'danger' | 'warning') {
  if (variant === 'danger') {
    return {
      iconBg: 'bg-danger-light',
      iconColor: 'text-danger-bg',
      border: 'border-danger-border',
      shadowColor: 'hsl(var(--color-danger-bg))',
      buttonVariant: 'danger' as ButtonVariant,
    };
  }

  // Warning variant
  return {
    iconBg: 'bg-warning-light',
    iconColor: 'text-warning-bg',
    border: 'border-warning-border',
    shadowColor: 'hsl(var(--color-warning-bg))',
    buttonVariant: 'warning' as ButtonVariant,
  };
}

/** Exit animation duration for blowup effect */
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

  // Dialog manages its own visibility and exit animation
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
      // Call the confirm handler, then trigger close animation
      // Note: If onConfirm is async, the dialog closes immediately after calling it
      // For proper async handling, the caller should manage loading state
      onConfirm();
      triggerClose();
    }
  }, [isLoading, onConfirm, triggerClose]);

  // Focus trap for keyboard accessibility
  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: confirmButtonRef,
    autoFocusFirstInput: false,
  });

  // Focus return management - restore focus when modal unmounts
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

  // Keyboard navigation: Enter confirms, Escape cancels
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

  // Don't render if not visible
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
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 ${backdropAnimationClass} ${closingPointerEvents}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className={`bg-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border ${styles.border} ${modalAnimationClass} ${closingPointerEvents}`}
          style={{ '--tw-shadow-color': styles.shadowColor } as React.CSSProperties}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${styles.iconBg} rounded-full`}>
                <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
              <h2 id="confirm-dialog-title" className="text-xl font-bold text-card-foreground">
                {title}
              </h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 focus-ring-default"
              aria-label="Close dialog"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <div className="mb-8">
            <p id="confirm-dialog-message" className="text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
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
