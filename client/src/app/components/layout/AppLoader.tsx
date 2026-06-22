/**
 * App Loader
 *
 * Branded boot splash shown while the app bootstraps. Calm in the happy path —
 * a breathing mark on the always-dark auth field, so it flows straight into the
 * gateway's CRT power-on. Diagnostics surface only when boot is slow or fails.
 */

import { useEffect, useState, type ReactNode } from 'react';

import { AlertCircle, RefreshCw } from 'lucide-react';

import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { env } from '@shared/config';
import { Button } from '@shared/ui';

import { OfflineInitializationPage } from '../../bootstrap/OfflineInitializationPage';

import type { UseAppBootstrapResult } from '../../bootstrap/types';

interface AppLoaderProps {
  context: UseAppBootstrapResult;
  onRetry?: () => void;
  onCancel?: () => void;
}

// Defer the "taking longer" hint until boot is genuinely dragging; a fast boot
// never shows it.
const SLOW_BOOT_MS = 4000;

const HERO_BLOOM =
  'drop-shadow(0 0 26px rgb(var(--auth-ambient) / 0.35)) drop-shadow(0 0 60px rgb(var(--auth-ambient) / 0.15))';

export function AppLoader({ context, onRetry, onCancel }: AppLoaderProps) {
  const { state, error, canRetry } = context;

  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    if (state === 'error' || state === 'complete') return;
    const timer = setTimeout(() => setIsSlow(true), SLOW_BOOT_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // Dedicated offline page owns its own auto-retry flow for network failures.
  if (error === 'OFFLINE_DURING_INIT' && onRetry) {
    return <OfflineInitializationPage onRetry={onRetry} />;
  }

  if (state === 'error') {
    return (
      <BootSplashField>
        <div className="flex max-w-xs flex-col items-center gap-5 px-8 text-center">
          <AlertCircle className="h-12 w-12 text-[hsl(var(--color-danger-bg))]" />
          <div className="flex flex-col items-center gap-2">
            <OdysseusLogo
              className="h-7 w-auto text-[rgb(var(--auth-text-dim))] drop-shadow-icon-bloom"
              aria-label="Odysseus"
            />
            <ConsoleStatus label="Initialization failed" />
          </div>
          {error && <p className="text-body-sm text-[rgb(var(--auth-text-dim))]">{error}</p>}
          {env.isDev() && error && (
            <details className="w-full text-left">
              <summary className="cursor-pointer text-caption text-[rgb(var(--auth-text-mute))] hover:text-[rgb(var(--auth-text-dim))]">
                Debug information
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-scrim/30 p-2 text-data-sm text-[rgb(var(--auth-text-mute))]">
                {error}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            {canRetry && onRetry && (
              <Button
                variant="primary"
                onClick={onRetry}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Try Again
              </Button>
            )}
            {onCancel && (
              <Button variant="cancel" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </BootSplashField>
    );
  }

  return (
    <BootSplashField>
      <div className="flex animate-in flex-col items-center gap-6 px-8 fade-in-0 duration-500">
        <img
          src={odysseusIcon}
          alt=""
          aria-hidden
          className="phosphor-breathe h-24 w-24 object-contain"
          style={{ filter: HERO_BLOOM }}
        />
        <div className="flex flex-col items-center gap-3">
          <OdysseusLogo
            className="h-7 w-auto text-[rgb(var(--auth-text-dim))] drop-shadow-icon-bloom"
            aria-label="Odysseus"
          />
          <ConsoleStatus label="Initializing" />
        </div>
        <p
          className={`text-body-sm text-[rgb(var(--auth-text-mute))] transition-opacity duration-500 ${
            isSlow ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Taking longer than expected — check your connection.
        </p>
      </div>
    </BootSplashField>
  );
}

function BootSplashField({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="auth-field fixed inset-0 z-50 flex items-center justify-center text-[rgb(var(--auth-text))]"
    >
      <span className="sr-only">Starting Odysseus</span>
      {children}
    </div>
  );
}

function ConsoleStatus({ label }: { label: string }) {
  return (
    <span className="phosphor-text type-label text-label-2xs tracking-ceremonial text-[rgb(var(--auth-text-mute))]">
      [ {label} ]
    </span>
  );
}
