/**
 * OverwriteConfirmDialog - Wrapper for ConfirmDialog (Warning variant)
 *
 * Thin wrapper around the unified ConfirmDialog component.
 * Provides a domain-specific interface for overwrite confirmations.
 */

import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';

interface OverwriteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OverwriteConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Overwrite',
  onConfirm,
  onCancel,
  isLoading = false,
}: OverwriteConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant="warning"
      title={title}
      message={message}
      confirmText={confirmText}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}
