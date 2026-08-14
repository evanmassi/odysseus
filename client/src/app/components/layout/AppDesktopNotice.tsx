/**
 * Desktop Notice
 *
 * Full-screen advisory for viewports too narrow to lay out the workspace.
 */

import { MonitorSmartphone } from 'lucide-react';

import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { LoadingSpinner } from '@shared/ui';

export function AppDesktopNotice() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Desktop recommended"
      className="auth-field fixed inset-0 z-50 flex items-center justify-center text-[rgb(var(--auth-text))]"
    >
      {/* Slowed well below the loader's cadence so it reads as a watermark, not a wait. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]"
      >
        <LoadingSpinner
          size={380}
          ringDuration={60}
          flakeDuration={45}
          className="text-[rgb(var(--auth-text))]"
        />
      </span>

      <div className="relative z-10 flex max-w-sm flex-col items-center gap-6 px-8 text-center">
        <MonitorSmartphone
          className="h-12 w-12 text-[rgb(var(--auth-text-dim))] drop-shadow-icon-bloom"
          strokeWidth={1.25}
        />

        <div className="flex flex-col items-center gap-3">
          <OdysseusLogo
            className="h-9 w-auto text-[rgb(var(--auth-text))] drop-shadow-icon-bloom"
            aria-label="Odysseus"
          />
          <p className="text-body font-medium text-[rgb(var(--auth-text))]">
            Best on a bigger screen
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-body-sm leading-relaxed text-[rgb(var(--auth-text-dim))]">
            Odysseus is built for a laptop or PC. Open it on one to see the whole lab.
          </p>
          <p className="phosphor-text text-body-sm text-[rgb(var(--auth-text))]">Enjoy!</p>
        </div>
      </div>
    </div>
  );
}
