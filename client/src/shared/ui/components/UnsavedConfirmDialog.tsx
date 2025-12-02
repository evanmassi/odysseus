/**
 * UnsavedConfirmDialog - Wrapper for ConfirmDialog (Warning variant)
 *
 * Thin wrapper around the unified ConfirmDialog component.
 * Provides a consistent interface for unsaved changes confirmations.
 */

import { ConfirmDialog } from './ConfirmDialog';

interface UnsavedConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnsavedConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: UnsavedConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant="warning"
      title={title}
      message={message}
      confirmText="Discard Changes"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
