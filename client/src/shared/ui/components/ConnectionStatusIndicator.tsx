/**
 * Connection Status Indicator
 *
 * Provides visual feedback about network status, connection quality,
 * and real-time sync status to users.
 */

import React, { useState, useEffect, useTransition, useRef, useCallback } from 'react';

import { useQueryClient, type MutationCacheNotifyEvent } from '@tanstack/react-query';
import { RefreshCw, WifiOff } from 'lucide-react';

import { ConnectionQuality } from '@infra/connection/NetworkMonitor';
import { useNetworkStatus } from '@infra/connection/useNetworkStatus';
import { getOptimisticUpdatesService } from '@infra/optimistic/OptimisticUpdatesService';

import { Tooltip } from '../primitives/tooltip/Tooltip';

/**
 * Connection status indicator component
 */
export const ConnectionStatusIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus(queryClient);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Monitor pending optimistic updates
  useEffect(() => {
    const optimisticService = getOptimisticUpdatesService();
    if (!optimisticService) return;

    const checkPendingOperations = () => {
      setPendingOperations(optimisticService.getPendingMutationsCount());
    };

    // Check immediately and then periodically
    checkPendingOperations();
    const interval = setInterval(checkPendingOperations, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close details card
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

  // Get connection quality for display
  const connectionQuality = networkStatus.getConnectionQuality();

  // Get appropriate icon and color for connection status
  // Colors use CSS variables from design system (variables.css)
  const getStatusDisplay = () => {
    if (!networkStatus.isOnline) {
      return {
        icon: 'wifi-off',
        color: 'hsl(var(--color-danger-bg))',
        text: 'Offline - Read-only',
        description: 'Viewing cached data, changes blocked until reconnected.',
      };
    }

    if (networkStatus.reconnectAttempts > 0) {
      return {
        icon: '◐',
        color: 'hsl(var(--color-warning-bg))',
        text: `Reconnecting... (${networkStatus.reconnectAttempts})`,
        description: 'Attempting to restore connection',
      };
    }

    if (pendingOperations > 0) {
      return {
        icon: '◐',
        color: 'hsl(var(--color-info-bg))',
        text: `Syncing (${pendingOperations})`,
        description: `${pendingOperations} operation${pendingOperations > 1 ? 's' : ''} pending`,
      };
    }

    switch (connectionQuality) {
      case ConnectionQuality.EXCELLENT:
        return {
          icon: '●',
          color: 'hsl(var(--color-success-bg))',
          text: 'Excellent',
          description: 'High-speed connection - all features available',
        };
      case ConnectionQuality.GOOD:
        return {
          icon: '●',
          color: 'hsl(var(--color-success-bg))',
          text: 'Connected',
          description: 'Good connection quality',
        };
      case ConnectionQuality.FAIR:
        return {
          icon: '●',
          color: 'hsl(var(--color-warning-bg))',
          text: 'Slow',
          description: 'Connection is slow - some features may be limited',
        };
      case ConnectionQuality.POOR:
        return {
          icon: '●',
          color: 'hsl(var(--color-danger-bg))',
          text: 'Very Slow',
          description: 'Poor connection - consider checking your network',
        };
      default:
        return {
          icon: '●',
          color: 'hsl(var(--color-success-bg))',
          text: 'Connected',
          description: 'Connected to server',
        };
    }
  };

  const status = getStatusDisplay();

  // Auto-show card for critical states only (offline, reconnecting, syncing)
  // Slow connection quality is indicated by dot color, not auto-expanding
  const shouldShow =
    !networkStatus.isOnline || networkStatus.reconnectAttempts > 0 || pendingOperations > 0;

  // Determine dot color based on connection quality
  // Uses CSS variables via inline styles for consistency
  const getDotColor = () => {
    switch (connectionQuality) {
      case ConnectionQuality.POOR:
        return 'hsl(var(--color-danger-bg))';
      case ConnectionQuality.FAIR:
        return 'hsl(var(--color-warning-bg))';
      default:
        return 'hsl(var(--color-success-bg))';
    }
  };

  // Determine card border color based on connection quality
  // Uses CSS variables from design system
  const getCardBorderColor = () => {
    switch (connectionQuality) {
      case ConnectionQuality.POOR:
        return 'hsl(var(--color-danger-bg))';
      case ConnectionQuality.FAIR:
        return 'hsl(var(--color-warning-bg))';
      default:
        return 'hsl(var(--color-success-bg))';
    }
  };

  // Only show in certain conditions or when user wants to see details
  if (!shouldShow && !showDetails) {
    // Show minimal indicator that can be clicked for details
    // Dot color reflects connection quality using CSS variables
    return (
      <Tooltip content="Connection status - click for details" side="left">
        <button
          onClick={() => setShowDetails(true)}
          className="fixed bottom-4 right-4 w-3 h-3 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform z-50"
          style={{ backgroundColor: getDotColor() }}
          aria-label="Connection status indicator"
        />
      </Tooltip>
    );
  }

  // Determine if we're in offline state for special styling
  const isOffline = !networkStatus.isOnline;

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
          borderLeftColor: isOffline ? 'hsl(var(--color-danger-bg))' : getCardBorderColor(),
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status.icon === 'wifi-off' ? (
              <WifiOff className="w-4 h-4 text-[hsl(var(--color-danger-bg))]" />
            ) : (
              <span style={{ color: status.color }} className="text-sm">
                {status.icon}
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

        {/* Additional details */}
        {(showDetails || shouldShow) && (
          <div
            className={`mt-2 pt-2 border-t ${isOffline ? 'border-status-offline-border' : 'border-border'}`}
          >
            {/* Online mode: show connection stats */}
            {!isOffline && (
              <div className="text-xs text-muted-foreground space-y-1">
                {networkStatus.downlink && (
                  <div>Speed: {networkStatus.downlink.toFixed(1)} Mbps</div>
                )}
                {networkStatus.rtt && <div>Latency: {networkStatus.rtt}ms</div>}
                {networkStatus.effectiveType && (
                  <div>Type: {networkStatus.effectiveType.toUpperCase()}</div>
                )}
                <div>
                  Last connected: {new Date(networkStatus.lastConnected).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Offline mode: compact timestamp + retry button on same row */}
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

/**
 * Real-time sync indicator for showing when data is being updated
 */
interface RealtimeSyncIndicatorProps {
  isVisible?: boolean;
}

export const RealtimeSyncIndicator: React.FC<RealtimeSyncIndicatorProps> = ({
  isVisible = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [_isPending, startTransition] = useTransition();

  // Monitor query cache for background updates
  const queryClient = useQueryClient();

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();

    const handleMutationUpdate = (event: MutationCacheNotifyEvent) => {
      // Access mutation from event
      const mutation = event.mutation;

      // Only animate for user-initiated mutations (create, update, delete)
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

    // Listen only to mutations, not all cache updates
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
