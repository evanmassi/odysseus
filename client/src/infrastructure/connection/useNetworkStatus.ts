/**
 * Network Status Hook
 *
 * React hook for subscribing to network status changes.
 */

import { useEffect, useState } from 'react';

import { initializeNetworkMonitor, getNetworkMonitor } from './NetworkMonitor';

import type { NetworkStatus } from './NetworkMonitor';
import type { QueryClient } from '@tanstack/react-query';

export function useNetworkStatus(queryClient: QueryClient) {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastConnected: Date.now(),
    reconnectAttempts: 0,
  });

  const monitor = getNetworkMonitor() ?? initializeNetworkMonitor(queryClient);

  useEffect(() => {
    const updateStatus = (newStatus: NetworkStatus) => {
      setStatus({ ...newStatus });
    };

    monitor.on('online', updateStatus);
    monitor.on('offline', updateStatus);
    monitor.on('reconnect-attempt', updateStatus);
    monitor.on('reconnect-success', updateStatus);
    monitor.on('reconnect-failed', updateStatus);

    setStatus(monitor.getStatus());

    return () => {
      monitor.off('online', updateStatus);
      monitor.off('offline', updateStatus);
      monitor.off('reconnect-attempt', updateStatus);
      monitor.off('reconnect-success', updateStatus);
      monitor.off('reconnect-failed', updateStatus);
    };
  }, [monitor]);

  return {
    ...status,
    retryConnection: () => monitor.retryConnection(),
  };
}
