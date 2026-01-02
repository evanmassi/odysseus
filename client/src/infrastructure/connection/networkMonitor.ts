/**
 * Network Connection Monitor
 * Phase 3 Step 3: Advanced connection robustness and offline/online handling
 *
 * Monitors network connectivity, quality, and provides intelligent reconnection strategies.
 * Integrates with React Query to handle offline scenarios gracefully.
 */

import { useEffect, useState } from 'react';

import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import type { NavigatorWithConnection } from '@shared/types';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Network status and quality metrics
 */
export interface NetworkStatus {
  isOnline: boolean;
  isHighQuality: boolean;
  downlink?: number; // Connection speed in Mbps
  effectiveType?: string; // '2g', '3g', '4g', etc.
  rtt?: number; // Round trip time in ms
  lastConnected: number; // Timestamp of last successful connection
  reconnectAttempts: number;
}

/**
 * Connection quality levels
 */
export enum ConnectionQuality {
  EXCELLENT = 'excellent', // > 10 Mbps, < 100ms RTT
  GOOD = 'good', // > 1 Mbps, < 300ms RTT
  FAIR = 'fair', // > 0.5 Mbps, < 1000ms RTT
  POOR = 'poor', // < 0.5 Mbps, > 1000ms RTT
  OFFLINE = 'offline',
}

/**
 * Network event types for listeners
 */
export type NetworkEvent =
  | 'online'
  | 'offline'
  | 'quality-change'
  | 'reconnect-attempt'
  | 'reconnect-success'
  | 'reconnect-failed';

/**
 * Network Monitor Service
 *
 * Provides comprehensive network monitoring with intelligent reconnection
 */
export class NetworkMonitor {
  private queryClient: QueryClient;
  private status: NetworkStatus;
  private listeners: Map<NetworkEvent, Array<(status: NetworkStatus) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private qualityCheckInterval: NodeJS.Timeout | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.status = {
      isOnline: navigator.onLine,
      isHighQuality: true,
      lastConnected: Date.now(),
      reconnectAttempts: 0,
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize all monitoring systems
   */
  private initializeMonitoring(): void {
    this.setupBrowserEvents();
    this.startHeartbeat();
    this.startQualityMonitoring();
    this.setupNetworkInformationAPI();
  }

  /**
   * Set up browser online/offline events
   */
  private setupBrowserEvents(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Handle coming back online
   */
  private async handleOnline(): Promise<void> {
    // Verify actual connectivity with server ping
    const isActuallyOnline = await this.pingServer();

    if (isActuallyOnline) {
      this.status.isOnline = true;
      this.status.lastConnected = Date.now();
      this.status.reconnectAttempts = 0;

      // Refetch all stale queries
      await this.queryClient.refetchQueries({ stale: true });

      // Show user feedback
      notifications.success('Connection restored - syncing data');

      this.notifyListeners('online');
      this.notifyListeners('reconnect-success');
    } else {
      // False positive - still offline
      logger.warn('False online event - still no server connectivity');
      this.handleOffline();
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.status.isOnline = false;
    this.status.isHighQuality = false;

    // Show user feedback
    notifications.error('Connection lost - working offline');

    // Start reconnection attempts
    this.startReconnectionAttempts();

    this.notifyListeners('offline');
  }

  /**
   * Start intelligent reconnection attempts
   */
  private startReconnectionAttempts(): void {
    if (this.reconnectTimeout) return; // Already attempting

    const attemptReconnect = async () => {
      if (this.status.isOnline) return; // Already reconnected

      this.status.reconnectAttempts++;

      this.notifyListeners('reconnect-attempt');

      const isOnline = await this.pingServer();

      if (isOnline) {
        await this.handleOnline();
        return;
      }

      // Schedule next attempt with exponential backoff (max 30 seconds)
      const delay = Math.min(1000 * Math.pow(2, this.status.reconnectAttempts - 1), 30000);

      this.reconnectTimeout = setTimeout(attemptReconnect, delay);

      if (this.status.reconnectAttempts >= 10) {
        logger.error('Maximum reconnection attempts reached');
        this.notifyListeners('reconnect-failed');

        notifications.persistentError('Unable to reconnect. Please check your connection.');

        // Stop attempting after 10 tries, but user can manually retry
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      }
    };

    // Start first attempt after 1 second
    this.reconnectTimeout = setTimeout(attemptReconnect, 1000);
  }

  /**
   * Ping server to verify actual connectivity
   */
  private async pingServer(): Promise<boolean> {
    try {
      // Use absolute URL for Electron compatibility (file:// protocol breaks relative paths)
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
      const healthUrl = `${import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api'}/public/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      logger.debug('Server ping failed', { error });
      return false;
    }
  }

  /**
   * Start connection quality monitoring
   */
  private startQualityMonitoring(): void {
    this.qualityCheckInterval = setInterval(() => {
      if (this.status.isOnline) {
        void this.checkConnectionQuality();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check connection quality and adjust React Query behavior
   */
  private async checkConnectionQuality(): Promise<void> {
    const quality = this.getConnectionQuality();
    const wasHighQuality = this.status.isHighQuality;

    this.status.isHighQuality =
      quality === ConnectionQuality.EXCELLENT || quality === ConnectionQuality.GOOD;

    // Notify if quality changed significantly
    if (wasHighQuality !== this.status.isHighQuality) {
      // Adjust React Query behavior based on connection quality
      if (this.status.isHighQuality) {
        // High quality - normal behavior
        this.queryClient.setDefaultOptions({
          queries: {
            networkMode: 'online',
            retry: 3,
            staleTime: 5 * 60 * 1000,
          },
        });
      } else {
        // Low quality - be more conservative
        this.queryClient.setDefaultOptions({
          queries: {
            networkMode: 'online',
            retry: 1, // Fewer retries on slow connections
            staleTime: 10 * 60 * 1000, // Use cached data longer
          },
        });
      }

      this.notifyListeners('quality-change');
    }
  }

  /**
   * Get current connection quality assessment
   */
  private getConnectionQuality(): ConnectionQuality {
    if (!this.status.isOnline) return ConnectionQuality.OFFLINE;

    // Use Network Information API if available (experimental browser API)
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (connection) {
      const { downlink, rtt, effectiveType } = connection;

      this.status.downlink = downlink;
      this.status.rtt = rtt;
      this.status.effectiveType = effectiveType;

      if (downlink && downlink > 10 && rtt && rtt < 100) return ConnectionQuality.EXCELLENT;
      if (downlink && downlink > 1 && rtt && rtt < 300) return ConnectionQuality.GOOD;
      if (downlink && downlink > 0.5 && rtt && rtt < 1000) return ConnectionQuality.FAIR;
      return ConnectionQuality.POOR;
    }

    // Fallback assessment based on timing
    return ConnectionQuality.GOOD; // Assume good if we can't measure
  }

  /**
   * Set up Network Information API monitoring
   */
  private setupNetworkInformationAPI(): void {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        void this.checkConnectionQuality();
      });
    }
  }

  /**
   * Start heartbeat to detect connection issues early
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.status.isOnline) {
        const isStillOnline = await this.pingServer();
        if (!isStillOnline) {
          this.handleOffline();
        }
      }
    }, 60000); // Heartbeat every minute
  }

  /**
   * Add event listener
   */
  public on(event: NetworkEvent, callback: (status: NetworkStatus) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: NetworkEvent, callback: (status: NetworkStatus) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: NetworkEvent): void {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        logger.error('Network monitor listener error', { error });
      }
    });
  }

  /**
   * Get current network status
   */
  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Manually trigger reconnection attempt
   */
  public async retryConnection(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.status.reconnectAttempts = 0;

    const isOnline = await this.pingServer();
    if (isOnline) {
      await this.handleOnline();
    } else {
      this.startReconnectionAttempts();
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }

    this.listeners.clear();
  }
}

/**
 * React hook for network status monitoring
 */
export function useNetworkStatus(queryClient: QueryClient) {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isHighQuality: true,
    lastConnected: Date.now(),
    reconnectAttempts: 0,
  });

  const [monitor] = useState(() => new NetworkMonitor(queryClient));

  useEffect(() => {
    const updateStatus = (newStatus: NetworkStatus) => {
      setStatus({ ...newStatus });
    };

    // Subscribe to all network events
    monitor.on('online', updateStatus);
    monitor.on('offline', updateStatus);
    monitor.on('quality-change', updateStatus);
    monitor.on('reconnect-attempt', updateStatus);
    monitor.on('reconnect-success', updateStatus);
    monitor.on('reconnect-failed', updateStatus);

    // Initial status
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
    getConnectionQuality: () => {
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

/**
 * Global network monitor instance
 */
let globalNetworkMonitor: NetworkMonitor | null = null;

/**
 * Initialize global network monitoring
 */
export const initializeNetworkMonitor = (queryClient: QueryClient): NetworkMonitor => {
  if (!globalNetworkMonitor) {
    globalNetworkMonitor = new NetworkMonitor(queryClient);
  }
  return globalNetworkMonitor;
};

/**
 * Get global network monitor instance
 */
export const getNetworkMonitor = (): NetworkMonitor | null => {
  return globalNetworkMonitor;
};

/**
 * Cleanup global network monitor
 */
export const cleanupNetworkMonitor = (): void => {
  if (globalNetworkMonitor) {
    globalNetworkMonitor.destroy();
    globalNetworkMonitor = null;
  }
};
