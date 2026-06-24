/**
 * Loading Overlay
 *
 * Full-page loading state matching offline initialization page styling
 */
import { OdysseusSpinner } from './OdysseusSpinner';

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({ message = 'Loading...', submessage }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[hsl(var(--overlay))] flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center">
          <div className="mb-4">
            <OdysseusSpinner size="xl" className="text-primary" />
          </div>

          <h1 className="text-xl font-bold text-card-foreground mb-2">{message}</h1>

          {submessage && <p className="text-body-sm text-muted-foreground">{submessage}</p>}
        </div>
      </div>
    </div>
  );
}
