/**
 * Info Dialog
 *
 * Single-button acknowledgment dialog for non-decision situations.
 */

import { useEffect, useRef, type ReactNode } from 'react';

import { useAnimatedClose, useFocusTrap } from '@shared/hooks';

import { Button } from '../../primitives';

import { AlertDialog } from './AlertDialog';
import { ALERT_VARIANT_STYLES } from './alertVariantStyles';

interface InfoDialogProps {
  isOpen: boolean;
  variant: 'warning' | 'info';
  title: string;
  message: ReactNode;
  buttonText?: string;
  onClose: () => void;
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

  const styles = ALERT_VARIANT_STYLES[variant];

  const { isVisible, isClosing, triggerClose } = useAnimatedClose({
    isOpen,
    onClose,
    exitDuration: EXIT_DURATION_MS,
  });

  const trapRef = useFocusTrap({
    isOpen: isVisible,
    initialFocusRef: closeButtonRef,
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

  return (
    <AlertDialog
      isClosing={isClosing}
      trapRef={trapRef}
      Mark={styles.Mark}
      iconColor={styles.iconColor}
      pin={styles.pin}
      title={title}
      message={message}
      onClose={triggerClose}
    >
      <Button ref={closeButtonRef} variant="secondary" onClick={triggerClose}>
        {buttonText}
      </Button>
    </AlertDialog>
  );
}
