/**
 * Connection Status Indicator
 * Phase 3 Step 3: Real-time UX patterns and connection feedback
 * 
 * Provides visual feedback about network status, connection quality,
 * and real-time sync status to users.
 */

import React, { useState, useEffect, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus, ConnectionQuality } from '@infra/connection/networkMonitor';
import { getOptimisticUpdatesService } from '@infra/optimistic/optimisticUpdates';

/**
 * Connection status indicator component
 */
export const ConnectionStatusIndicator: React.FC = () => {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus(queryClient);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

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

  // Get connection quality for display
  const connectionQuality = networkStatus.getConnectionQuality();

  // Get appropriate icon and color for connection status
  const getStatusDisplay = () => {
    if (!networkStatus.isOnline) {
      return {
        icon: '📴',
        color: '#ef4444', // red-500
        text: 'Offline',
        description: 'Working offline - changes will sync when reconnected'
      };
    }

    if (networkStatus.reconnectAttempts > 0) {
      return {
        icon: '🔄',
        color: '#f59e0b', // amber-500
        text: `Reconnecting... (${networkStatus.reconnectAttempts})`,
        description: 'Attempting to restore connection'
      };
    }

    if (pendingOperations > 0) {
      return {
        icon: '⏳',
        color: '#3b82f6', // blue-500
        text: `Syncing (${pendingOperations})`,
        description: `${pendingOperations} operation${pendingOperations > 1 ? 's' : ''} pending`
      };
    }

    switch (connectionQuality) {
      case ConnectionQuality.EXCELLENT:
        return {
          icon: '🟢',
          color: '#10b981', // emerald-500
          text: 'Excellent',
          description: 'High-speed connection - all features available'
        };
      case ConnectionQuality.GOOD:
        return {
          icon: '🟢',
          color: '#10b981', // emerald-500
          text: 'Connected',
          description: 'Good connection quality'
        };
      case ConnectionQuality.FAIR:
        return {
          icon: '🟡',
          color: '#f59e0b', // amber-500
          text: 'Slow',
          description: 'Connection is slow - some features may be limited'
        };
      case ConnectionQuality.POOR:
        return {
          icon: '🔴',
          color: '#ef4444', // red-500
          text: 'Very Slow',
          description: 'Poor connection - consider checking your network'
        };
      default:
        return {
          icon: '🟢',
          color: '#10b981',
          text: 'Connected',
          description: 'Connected to server'
        };
    }
  };

  const status = getStatusDisplay();

  // Don't show if everything is good and no pending operations
  const shouldShow = !networkStatus.isOnline || 
                    networkStatus.reconnectAttempts > 0 || 
                    pendingOperations > 0 ||
                    connectionQuality === ConnectionQuality.POOR ||
                    connectionQuality === ConnectionQuality.FAIR;

  // Only show in certain conditions or when user wants to see details
  if (!shouldShow && !showDetails) {
    // Show minimal indicator that can be clicked for details
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="fixed bottom-4 right-4 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-lg hover:scale-110 transition-transform z-50"
        title="Connection status - click for details"
        aria-label="Connection status indicator"
      />
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs"
        style={{ minWidth: '200px' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span style={{ color: status.color }} className="text-sm">
              {status.icon}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {status.text}
            </span>
          </div>
          
          {shouldShow && (
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
              aria-label="Hide connection details"
            >
              ✕
            </button>
          )}
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {status.description}
        </p>
        
        {/* Additional details */}
        {(showDetails || shouldShow) && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {networkStatus.downlink && (
                <div>Speed: {networkStatus.downlink.toFixed(1)} Mbps</div>
              )}
              {networkStatus.rtt && (
                <div>Latency: {networkStatus.rtt}ms</div>
              )}
              {networkStatus.effectiveType && (
                <div>Type: {networkStatus.effectiveType.toUpperCase()}</div>
              )}
              <div>
                Last connected: {new Date(networkStatus.lastConnected).toLocaleTimeString()}
              </div>
            </div>
            
            {!networkStatus.isOnline && (
              <button
                onClick={networkStatus.retryConnection}
                className="mt-2 w-full bg-action hover:bg-action-hover text-white text-xs py-1 px-2 rounded transition-colors"
              >
                Retry Connection
              </button>
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
  isVisible = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Monitor query cache for background updates
  const queryClient = useQueryClient();

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    
    const handleMutationUpdate = (mutation: any) => {
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
    <div className="fixed top-4 right-4 z-40 flex items-center space-x-2 bg-blue-500 text-white px-3 py-1 rounded-full shadow-lg text-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
};

/**
 * Offline indicator banner
 */
export const OfflineBanner: React.FC = () => {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus(queryClient);

  if (networkStatus.isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning-bg text-white py-2 px-4 text-center text-sm font-medium">
      <div className="flex items-center justify-center space-x-2">
        <span>📴</span>
        <span>You're offline. Changes will be saved locally and synced when reconnected.</span>
        <button
          onClick={networkStatus.retryConnection}
          className="ml-4 underline hover:no-underline"
        >
          Try to reconnect
        </button>
      </div>
    </div>
  );
};

/**
 * Loading skeleton component for optimistic updates
 */
interface OptimisticLoadingSkeletonProps {
  children: React.ReactNode;
  isOptimistic?: boolean;
}

export const OptimisticLoadingSkeleton: React.FC<OptimisticLoadingSkeletonProps> = ({ children, isOptimistic = false }) => {
  if (!isOptimistic) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-60">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      <div className="absolute top-1 right-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

/**
 * Connection quality badge for display in headers/status bars
 */
interface ConnectionQualityBadgeProps {
  className?: string;
}

export const ConnectionQualityBadge: React.FC<ConnectionQualityBadgeProps> = ({
  className = ''
}) => {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus(queryClient);
  const quality = networkStatus.getConnectionQuality();

  const getBadgeStyle = () => {
    switch (quality) {
      case ConnectionQuality.EXCELLENT:
      case ConnectionQuality.GOOD:
        return 'bg-success-light text-success-text border-success-border';
      case ConnectionQuality.FAIR:
        return 'bg-warning-light text-warning-text border-warning-border';
      case ConnectionQuality.POOR:
        return 'bg-danger-light text-danger-text border-danger-border';
      case ConnectionQuality.OFFLINE:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-info-light text-info-text border-info-border';
    }
  };

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}
      title={`Connection: ${quality}`}
    >
      {quality}
    </span>
  );
};
