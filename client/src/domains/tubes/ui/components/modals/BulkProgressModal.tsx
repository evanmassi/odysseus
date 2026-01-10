import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

import { ModalPortal } from '@shared/ui/components/ModalPortal';

import type { BulkUpdateProgress } from '@domains/tubes/types';

interface BulkProgressModalProps {
  isOpen: boolean;
  progress: BulkUpdateProgress;
  onClose: () => void;
  canClose: boolean;
}

export function BulkProgressModal({ isOpen, progress, onClose, canClose }: BulkProgressModalProps) {
  if (!isOpen) return null;

  const getPhaseLabel = (phase: BulkUpdateProgress['phase']) => {
    switch (phase) {
      case 'preparing':
        return 'Preparing updates...';
      case 'validating':
        return 'Validating data...';
      case 'updating':
        return 'Updating tubes...';
      case 'completing':
        return 'Finalizing...';
      default:
        return 'Processing...';
    }
  };

  const getPhaseIcon = (phase: BulkUpdateProgress['phase']) => {
    switch (phase) {
      case 'preparing':
      case 'validating':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'updating':
        return <Loader2 className="w-5 h-5 animate-spin text-odysseus-primary" />;
      case 'completing':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-gray-500" />;
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const hasErrors = progress.errors.length > 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-odysseus-surface rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-odysseus-border">
          <div className="text-center mb-6">
            <div className="mb-4">{getPhaseIcon(progress.phase)}</div>

            <h3 className="text-lg font-semibold text-odysseus-dark mb-2">
              {getPhaseLabel(progress.phase)}
            </h3>

            <div className="text-sm text-odysseus-muted">
              {progress.current} of {progress.total} tubes
              {progress.currentTubeId && (
                <div className="text-xs mt-1 text-gray-500">
                  Processing: {progress.currentTubeId}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-odysseus-primary h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-center text-sm text-odysseus-muted">
              {Math.round(progressPercentage)}% complete
            </div>
          </div>

          {/* Error Summary */}
          {hasErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800 mb-2">
                <AlertCircle size={16} />
                <span className="font-medium text-sm">
                  {progress.errors.length} issue{progress.errors.length > 1 ? 's' : ''} encountered
                </span>
              </div>
              <div className="max-h-20 overflow-y-auto text-xs text-red-700 space-y-1">
                {progress.errors.slice(0, 3).map((error, index) => (
                  <div key={index} className="flex items-start space-x-1">
                    <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {error.tubeId}: {error.error}
                    </span>
                  </div>
                ))}
                {progress.errors.length > 3 && (
                  <div className="text-red-600 italic">
                    +{progress.errors.length - 3} more errors...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close button (only shown when operation is complete) */}
          {canClose && (
            <div className="text-center">
              <button onClick={onClose} className="btn btn-primary px-6">
                {hasErrors ? 'View Results' : 'Complete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
