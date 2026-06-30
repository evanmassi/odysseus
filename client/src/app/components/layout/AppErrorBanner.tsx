/**
 * App Error Banner
 *
 * Fixed overlay listing unhandled runtime errors (JS errors and promise rejections),
 * with copy-all and dismiss. Mounted once at the app root — a fuzzy-scrim tactical card
 * in danger red (like tooltips), forced dark so the red reads the same over any theme.
 */

import type { CSSProperties } from 'react';

import { X, Copy } from 'lucide-react';

import { logger } from '@infra/logger';
import { ScrimHalo } from '@shared/ui';

interface AppErrorBannerProps {
  errors: string[];
  onClear: () => void;
}

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

// Capture the real theme's --lit before the card forces data-theme="dark" (which would pin it
// to 1), so the corner-pin glow can light only in real dark mode while every red stays constant.
const REAL_LIT_STYLE = { '--real-lit': 'var(--lit)' } as CSSProperties;

// Errors arrive as "[HH:MM:SS] message"; split so the timestamp can recede from the message.
function splitTimestamp(raw: string): { stamp: string | null; message: string } {
  const match = raw.match(/^(\[[^\]]*\])\s+([\s\S]+)$/);
  return match ? { stamp: match[1], message: match[2] } : { stamp: null, message: raw };
}

export function AppErrorBanner({ errors, onClear }: AppErrorBannerProps) {
  if (errors.length === 0) return null;

  const copyErrors = () => {
    void navigator.clipboard
      .writeText(errors.join('\n\n'))
      .catch(error => logger.error('Failed to copy errors to clipboard', { error }));
  };

  return (
    <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-2xl" style={REAL_LIT_STYLE}>
      <div data-theme="dark" className="relative isolate px-5 py-4">
        <ScrimHalo />
        {CORNER_PINS.map(pos => (
          <span
            key={pos}
            aria-hidden
            className={`pointer-events-none absolute h-0.5 w-1.5 bg-danger-text shadow-[0_0_5px_hsl(var(--color-danger-text)/calc(0.8_*_var(--real-lit)))] ${pos}`}
          />
        ))}

        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="font-mono text-label-2xs font-medium uppercase tracking-[0.24em] text-danger-text">
            Unexpected Errors ({errors.length})
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Dismiss errors"
            className="-mt-0.5 text-danger-text/70 transition-colors hover:text-danger-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-32 space-y-1.5 overflow-y-auto">
          {errors.slice(-3).map(error => {
            const { stamp, message } = splitTimestamp(error);
            return (
              <p key={error} className="font-mono text-caption leading-relaxed text-danger-text">
                {stamp && <span className="text-danger-text/55">{stamp} </span>}
                {message}
              </p>
            );
          })}
        </div>

        <button
          type="button"
          onClick={copyErrors}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-caption text-danger-text/70 transition-colors hover:text-danger-text"
        >
          <Copy size={12} />
          Copy all errors
        </button>
      </div>
    </div>
  );
}
