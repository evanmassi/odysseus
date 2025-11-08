import { useEffect, useState } from 'react';

import { X, AlertTriangle } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';

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
  confirmText = "Overwrite",
  onConfirm,
  onCancel,
  isLoading = false
}: OverwriteConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const modalService = useModalStore();

  // Focus return management - restore focus when modal unmounts
  useEffect(() => {
    if (!isOpen) return;

    return () => {
      const previousFocus = modalService.overwriteConfirm.previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [isOpen, modalService.overwriteConfirm.previousFocusElement]);

  // Reset confirming state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);

      const handleKeyDown = (e: KeyboardEvent) => {
        const isProcessing = isLoading || isConfirming;
        if (e.key === 'Enter' && !isProcessing) {
          e.preventDefault();
          e.stopPropagation();
          setIsConfirming(true);
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
    } else {
      // Reset state when modal closes
      setIsConfirming(false);
      // Return undefined explicitly to satisfy TypeScript
      return undefined;
    }
  }, [isOpen, onConfirm, onCancel, isLoading, isConfirming]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-yellow-500/30 border border-yellow-200 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
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
            disabled={isLoading || isConfirming}
            className="btn btn-secondary px-6"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isConfirming) {
                setIsConfirming(true);
                onConfirm();
              }
            }}
            disabled={isLoading || isConfirming}
            autoFocus
            className="btn bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700 px-6"
          >
            {isLoading || isConfirming ? (
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
  );
}
