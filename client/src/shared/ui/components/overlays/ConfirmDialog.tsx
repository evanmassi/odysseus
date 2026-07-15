/**
 * Confirmation Dialog
 *
 * Danger/warning confirmation with keyboard navigation and focus trap.
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';

import { useAnimatedClose, useFocusTrap } from '@shared/hooks';
import { AnimatedWarningMark } from '@shared/ui/components/icons/AnimatedWarningMark';
import { AnimatedXMark } from '@shared/ui/components/icons/AnimatedXMark';

import { Button, type ButtonVariant } from '../../primitives';

import { AlertDialog } from './AlertDialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  variant: 'danger' | 'warning';
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const styles = getVariantStyles(variant);

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
    initialFocusRef: confirmButtonRef,
  });

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

  return (
    <AlertDialog
      isClosing={isClosing}
      trapRef={trapRef}
      Mark={styles.Mark}
      iconColor={styles.iconColor}
      pin={styles.pin}
      title={title}
      message={message}
      onClose={handleCancel}
      closeDisabled={isLoading}
    >
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
    </AlertDialog>
  );
}
