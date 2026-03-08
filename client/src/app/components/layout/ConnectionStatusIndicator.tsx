/**
 * Connection Status Indicator
 *
 * Provides visual feedback about network connectivity and reconnection status.
 */

import React, { useState, useEffect, useTransition, useRef, useCallback } from 'react';

import { useQueryClient, type MutationCacheNotifyEvent } from '@tanstack/react-query';
import { RefreshCw, WifiOff } from 'lucide-react';

import { useNetworkStatus } from '@infra/connection';
import { Tooltip } from '@shared/ui';

export const ConnectionStatusIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus(queryClient);
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
      setShowDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!showDetails) return;

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDetails, handleClickOutside]);

  const getStatusDisplay = () => {
    if (!networkStatus.isOnline) {
      return {
        icon: 'wifi-off' as const,
        color: 'hsl(var(--color-danger-bg))',
        text: 'Offline - Read-only',
        description: 'Viewing cached data, changes blocked until reconnected.',
      };
    }

    if (networkStatus.reconnectAttempts > 0) {
      return {
        icon: 'reconnecting' as const,
        color: 'hsl(var(--color-warning-bg))',
        text: `Reconnecting... (${networkStatus.reconnectAttempts})`,
        description: 'Attempting to restore connection',
      };
    }

    return {
      icon: 'online' as const,
      color: 'hsl(var(--color-success-bg))',
      text: 'Connected',
      description: 'Connected to server',
    };
  };

  const status = getStatusDisplay();
  const isOffline = !networkStatus.isOnline;
  const shouldShow = isOffline || networkStatus.reconnectAttempts > 0;

  if (!shouldShow && !showDetails) {
    return (
      <Tooltip content="Connection status - click for details" side="left">
        <button
          onClick={() => setShowDetails(true)}
          className="fixed bottom-4 right-4 w-3 h-3 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform z-50"
          style={{ backgroundColor: 'hsl(var(--color-success-bg))' }}
          aria-label="Connection status indicator"
        />
      </Tooltip>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" ref={cardRef}>
      <div
        className={`rounded-lg shadow-lg p-3 border-l-4 ${
          isOffline
            ? 'bg-status-offline border-t border-r border-b border-status-offline-border'
            : 'bg-card border-t border-r border-b border-border max-w-xs'
        }`}
        style={{
          minWidth: isOffline ? '320px' : '200px',
          borderLeftColor: isOffline
            ? 'hsl(var(--color-danger-bg))'
            : 'hsl(var(--color-success-bg))',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status.icon === 'wifi-off' ? (
              <WifiOff className="w-4 h-4 text-[hsl(var(--color-danger-bg))]" />
            ) : (
              <span style={{ color: status.color }} className="text-sm">
                {status.icon === 'reconnecting' ? '◐' : '●'}
              </span>
            )}
            <span
              className={`text-sm font-medium ${isOffline ? 'text-[hsl(var(--color-danger-bg))]' : 'text-card-foreground'}`}
            >
              {status.text}
            </span>
          </div>

          {!isOffline && (
            <button
              onClick={() => setShowDetails(false)}
              className="text-muted-foreground hover:text-secondary-foreground text-xs"
              aria-label="Hide connection details"
            >
              ✕
            </button>
          )}
        </div>

        <p
          className={`text-xs mt-1 ${isOffline ? 'text-status-offline-foreground' : 'text-secondary-foreground'}`}
        >
          {status.description}
        </p>

        {(showDetails || shouldShow) && (
          <div
            className={`mt-2 pt-2 border-t ${isOffline ? 'border-status-offline-border' : 'border-border'}`}
          >
            {!isOffline && (
              <div className="text-xs text-muted-foreground">
                Last connected: {new Date(networkStatus.lastConnected).toLocaleTimeString()}
              </div>
            )}

            {isOffline && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Last connected: {new Date(networkStatus.lastConnected).toLocaleTimeString()}
                </span>
                <button
                  onClick={networkStatus.retryConnection}
                  className="p-1.5 bg-status-offline-muted hover:bg-status-offline-hover text-status-offline-foreground rounded transition-colors"
                  aria-label="Retry connection"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface RealtimeSyncIndicatorProps {
  isVisible?: boolean;
}

export const RealtimeSyncIndicator: React.FC<RealtimeSyncIndicatorProps> = ({
  isVisible = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const queryClient = useQueryClient();

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();

    const handleMutationUpdate = (event: MutationCacheNotifyEvent) => {
      const mutation = event.mutation;

      if (mutation?.state?.status === 'pending') {
        startTransition(() => {
          setIsAnimating(true);
        });
      } else if (mutation?.state?.status === 'success' || mutation?.state?.status === 'error') {
        startTransition(() => {
          setIsAnimating(false);
        });
      }
    };

    const unsubscribe = mutationCache.subscribe(handleMutationUpdate);

    return unsubscribe;
  }, [queryClient]);

  if (!isVisible || !isAnimating) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center space-x-2 bg-info-bg text-white px-3 py-1 rounded-full shadow-lg text-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
};
