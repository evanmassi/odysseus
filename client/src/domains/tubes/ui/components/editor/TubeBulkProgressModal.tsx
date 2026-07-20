/**
 * Bulk Progress Modal
 *
 * Indeterminate overlay shown while a bulk tube update is in flight (the update is a single
 * atomic request, so there is no incremental progress to report).
 */

import { Button, LoadingSpinner } from '@shared/ui';
import { ModalPortal } from '@shared/ui/components/overlays/ModalPortal';

interface TubeBulkProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose: boolean;
  tubeCount: number;
  hasErrors: boolean;
}

export function TubeBulkProgressModal({
  isOpen,
  onClose,
  canClose,
  tubeCount,
  hasErrors,
}: TubeBulkProgressModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-[hsl(var(--overlay))] flex items-center justify-center z-50 animate-modal-backdrop-in">
        <div className="bg-card rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-border animate-modal-reveal-in">
          <div className="text-center mb-6">
            <div className="mb-4">
              <LoadingSpinner size={20} className="text-primary" />
            </div>

            <h3 className="text-lg font-semibold text-card-foreground">
              Updating {tubeCount} tube{tubeCount !== 1 ? 's' : ''}...
            </h3>
          </div>

          {canClose && (
            <div className="text-center">
              <Button variant="primary" onClick={onClose}>
                {hasErrors ? 'View Results' : 'Complete'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
