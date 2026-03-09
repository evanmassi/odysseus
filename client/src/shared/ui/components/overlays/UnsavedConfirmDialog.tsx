/**
 * Unsaved Changes Dialog
 *
 * Warning-variant ConfirmDialog preset for discarding unsaved changes.
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
