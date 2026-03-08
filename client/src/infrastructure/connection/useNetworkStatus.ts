/**
 * Network Status Hook
 *
 * React hook for subscribing to network status changes.
 * Wraps the global NetworkMonitor service for component use.
 */

import { useEffect, useState } from 'react';

import { ConnectionQuality, initializeNetworkMonitor, getNetworkMonitor } from './NetworkMonitor';

import type { NetworkStatus } from './NetworkMonitor';
import type { QueryClient } from '@tanstack/react-query';

export function useNetworkStatus(queryClient: QueryClient) {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isHighQuality: true,
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
    monitor.on('quality-change', updateStatus);
    monitor.on('reconnect-attempt', updateStatus);
    monitor.on('reconnect-success', updateStatus);
    monitor.on('reconnect-failed', updateStatus);

    setStatus(monitor.getStatus());

    return () => {
      monitor.off('online', updateStatus);
      monitor.off('offline', updateStatus);
      monitor.off('quality-change', updateStatus);
      monitor.off('reconnect-attempt', updateStatus);
      monitor.off('reconnect-success', updateStatus);
      monitor.off('reconnect-failed', updateStatus);
    };
  }, [monitor]);

  return {
    ...status,
    retryConnection: () => monitor.retryConnection(),
    getConnectionQuality: (): ConnectionQuality => {
      if (!status.isOnline) return ConnectionQuality.OFFLINE;

      if (status.downlink && status.rtt) {
        if (status.downlink > 10 && status.rtt < 100) return ConnectionQuality.EXCELLENT;
        if (status.downlink > 1 && status.rtt < 300) return ConnectionQuality.GOOD;
        if (status.downlink > 0.5 && status.rtt < 1000) return ConnectionQuality.FAIR;
        return ConnectionQuality.POOR;
      }

      return status.isHighQuality ? ConnectionQuality.GOOD : ConnectionQuality.FAIR;
    },
  };
}
