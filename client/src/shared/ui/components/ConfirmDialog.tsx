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

import { useEffect, useRef, type ReactNode } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

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
 */
function getVariantStyles(variant: 'danger' | 'warning') {
  if (variant === 'danger') {
    return {
      iconBg: 'bg-danger-light',
      iconColor: 'text-danger-bg',
      border: 'border-danger-border',
      shadow: 'shadow-red-500/30',
      buttonClass: 'btn-danger',
    };
  }

  // Warning variant
  return {
    iconBg: 'bg-warning-light',
    iconColor: 'text-warning-bg',
    border: 'border-warning-border',
    shadow: 'shadow-yellow-500/30',
    buttonClass: 'btn-warning',
  };
}

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

  // Focus trap for keyboard accessibility
  const trapRef = useFocusTrap({
    isOpen,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: confirmButtonRef,
    autoFocusFirstInput: false,
  });

  // Focus return management - restore focus when modal unmounts
  useEffect(() => {
    if (!isOpen) return;

    return () => {
      const modalType = variant === 'danger' ? 'deleteConfirm' : 'overwriteConfirm';
      const previousFocus = modalService[modalType].previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [isOpen, modalService, variant]);

  // Keyboard navigation: Enter confirms, Escape cancels
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isProcessing = isLoading;

      if (e.key === 'Enter' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      } else if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onConfirm, onCancel, isLoading]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className={`bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl ${styles.shadow} border ${styles.border} animate-in slide-in-from-bottom-4 duration-500`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${styles.iconBg} rounded-full`}>
                <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
              <h2 id="confirm-dialog-title" className="text-xl font-bold text-odysseus-dark">
                {title}
              </h2>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-odysseus-surface-hover text-odysseus-muted hover:text-odysseus-dark transition-all duration-200 disabled:opacity-50 focus-ring-default"
              aria-label="Close dialog"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <div className="mb-8">
            <p id="confirm-dialog-message" className="text-odysseus-muted leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="btn btn-secondary px-6"
              type="button"
            >
              Cancel
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={isLoading}
              className={`${styles.buttonClass} px-6`}
              type="button"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="spinner w-4 h-4"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
