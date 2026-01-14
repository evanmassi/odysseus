/**
 * Loading Overlay Component
 *
 * Full-page loading overlay with dark backdrop and centered card.
 * Matches the styling of the offline initialization page for consistency.
 * Use for major transitions, full-page loading states.
 */

import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  /** Loading message to display */
  message?: string;
  /** Optional submessage for additional context */
  submessage?: string;
}

export function LoadingOverlay({ message = 'Loading...', submessage }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center">
          <div className="mb-4">
            <Loader2 className="w-14 h-14 text-primary animate-spin mx-auto" />
          </div>

          <h1 className="text-xl font-bold text-dark mb-2">{message}</h1>

          {submessage && <p className="text-sm text-text-muted">{submessage}</p>}
        </div>
      </div>
    </div>
  );
}
