import { useEffect } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useModalFocusTrap } from '@shared/hooks/keyboard';
import { useModalKeyboardNav } from '@shared/hooks/keyboard/useModalKeyboardNav';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  onConfirm,
  onCancel,
  isLoading = false
}: DeleteConfirmDialogProps) {
  const modalService = useModalStore();

  // Focus return management - restore focus when modal unmounts
  useEffect(() => {
    if (!isOpen) return;

    return () => {
      const previousFocus = modalService.deleteConfirm.previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [isOpen, modalService.deleteConfirm.previousFocusElement]);

  // Unified keyboard navigation: Escape = cancel
  // Enter naturally triggers focused button (delete button)
  useModalKeyboardNav({
    onEscape: () => {
      if (!isLoading) onCancel();
    },
    enabled: isOpen
  });

  // Industry-standard focus trap for modal accessibility
  const trapRef = useModalFocusTrap({ enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div ref={trapRef} className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-red-500/30 border border-red-200 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-odysseus-dark">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-odysseus-surface-hover text-odysseus-muted hover:text-odysseus-dark transition-all duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <p className="text-odysseus-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary px-6"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            autoFocus
            className="btn btn-danger px-6"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="spinner w-4 h-4"></div>
                <span>Deleting...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
