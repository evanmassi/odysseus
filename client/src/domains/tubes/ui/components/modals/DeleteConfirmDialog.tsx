/**
 * DeleteConfirmDialog - Wrapper for ConfirmDialog (Danger variant)
 *
 * Thin wrapper around the ConfirmDialog component.
 * Provides a domain-specific interface for delete confirmations.
 */

import type { ReactNode } from 'react';

import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant="danger"
      title={title}
      message={message}
      confirmText={confirmText}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}
