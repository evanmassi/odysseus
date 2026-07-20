/**
 * Network Status Hook
 *
 * Bridges NetworkMonitor's connection events into React state; returns the live
 * status plus a retryConnection action.
 */

import { useEffect, useState } from 'react';

import { initializeNetworkMonitor, getNetworkMonitor } from './NetworkMonitor';

import type { NetworkStatus, NetworkEvent } from './NetworkMonitor';
import type { QueryClient } from '@tanstack/react-query';

const NETWORK_EVENTS: NetworkEvent[] = [
  'online',
  'offline',
  'reconnect-attempt',
  'reconnect-success',
  'reconnect-failed',
];

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

    NETWORK_EVENTS.forEach(event => monitor.on(event, updateStatus));
    setStatus(monitor.getStatus());

    return () => {
      NETWORK_EVENTS.forEach(event => monitor.off(event, updateStatus));
    };
  }, [monitor]);

  return {
    ...status,
    retryConnection: () => monitor.retryConnection(),
  };
}
