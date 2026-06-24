/**
 * Offline Initialization Page
 *
 * Displayed when the app cannot initialize due to no network connection.
 * Provides auto-retry countdown and listens for browser online event.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { WifiOff, RefreshCw } from 'lucide-react';

import { Button, OdysseusSpinner } from '@shared/ui';

interface OfflineInitializationPageProps {
  onRetry: () => void;
}

const AUTO_RETRY_SECONDS = 10;
const RETRY_SPINNER_DELAY_MS = 300;
const RETRY_COOLDOWN_MS = 1000;

export function OfflineInitializationPage({ onRetry }: OfflineInitializationPageProps) {
  const [countdown, setCountdown] = useState(AUTO_RETRY_SECONDS);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    const preDelay = setTimeout(() => {
      onRetry();
      const cooldown = setTimeout(() => {
        setIsRetrying(false);
        setCountdown(AUTO_RETRY_SECONDS);
      }, RETRY_COOLDOWN_MS);
      retryTimeouts.current.push(cooldown);
    }, RETRY_SPINNER_DELAY_MS);
    retryTimeouts.current.push(preDelay);
  }, [onRetry]);

  useEffect(() => () => retryTimeouts.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (isRetrying) return;

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        handleRetry();
      } else {
        setCountdown(c => c - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRetrying, countdown, handleRetry]);

  useEffect(() => {
    const handleOnline = () => {
      handleRetry();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [handleRetry]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 bg-[hsl(var(--overlay))] flex items-center justify-center z-50"
    >
      <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            {isRetrying ? (
              <OdysseusSpinner size="xl" className="text-primary" />
            ) : (
              <WifiOff className="w-14 h-14 text-danger-bg" />
            )}
          </div>

          <h1
            className={`text-xl font-bold mb-2 ${isRetrying ? 'text-card-foreground' : 'text-danger-bg'}`}
          >
            {isRetrying ? 'Connecting...' : "You're Offline"}
          </h1>

          <p className="text-body-sm text-muted-foreground">
            {isRetrying ? 'Attempting to reach the server' : 'Connect to the internet to continue'}
          </p>
        </div>

        <div className="space-y-4">
          {!isRetrying && (
            <div className="text-center">
              <p className="text-body-sm text-muted-foreground">
                Retrying in <span className="font-semibold text-card-foreground">{countdown}s</span>
              </p>
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            onClick={handleRetry}
            isLoading={isRetrying}
            loadingText="Connecting..."
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Now
          </Button>
        </div>
      </div>
    </div>
  );
}
