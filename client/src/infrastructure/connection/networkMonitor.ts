/**
 * Network Connection Monitor
 *
 * Monitors actual server reachability (not just browser online/offline).
 * Provides intelligent reconnection with exponential backoff.
 *
 * Architecture:
 * - NetworkMonitor is the ONLY system that should listen to browser online/offline events
 * - Socket and other systems should notify NetworkMonitor of connection changes
 * - All network status checks should go through networkState.ts (isOffline/isOnline)
 */

import { useEffect, useState } from 'react';

import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import { setOffline, markInitialized } from './networkState';

import type { NavigatorWithConnection } from '@shared/types';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Network status and quality metrics
 */
export interface NetworkStatus {
  isOnline: boolean;
  isHighQuality: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  lastConnected: number;
  reconnectAttempts: number;
}

/**
 * Connection quality levels based on speed and latency
 */
export enum ConnectionQuality {
  EXCELLENT = 'excellent', // > 10 Mbps, < 100ms RTT
  GOOD = 'good', // > 1 Mbps, < 300ms RTT
  FAIR = 'fair', // > 0.5 Mbps, < 1000ms RTT
  POOR = 'poor', // < 0.5 Mbps, > 1000ms RTT
  OFFLINE = 'offline',
}

/**
 * Network event types for internal pub/sub
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
 * Manages connection status. Other systems (Socket, HTTP client)
 * should read from networkState and notify this monitor of connection changes.
 */
export class NetworkMonitor {
  private queryClient: QueryClient;
  private status: NetworkStatus;
  private listeners: Map<NetworkEvent, Array<(status: NetworkStatus) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private qualityCheckInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<void> | null = null;

  // Store bound handlers for proper cleanup
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.status = {
      isOnline: navigator.onLine,
      isHighQuality: true,
      lastConnected: Date.now(),
      reconnectAttempts: 0,
    };

    // Create bound handlers once for proper addEventListener/removeEventListener pairing
    this.boundHandleOnline = this.handleBrowserOnline.bind(this);
    this.boundHandleOffline = this.handleBrowserOffline.bind(this);

    // Set initial state from browser (will be verified by server ping)
    setOffline(!navigator.onLine);

    // Start monitoring and verification
    this.setupBrowserEvents();
    this.startHeartbeat();
    this.startQualityMonitoring();
    this.setupNetworkInformationAPI();

    // Store initialization promise for awaitable init
    this.initializationPromise = this.verifyInitialConnectivity();
  }

  /**
   * Wait for initial connectivity verification to complete.
   * Call this before starting socket connections to ensure proper initialization order.
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Verify actual server connectivity on startup.
   * Updates shared network state based on real server reachability.
   */
  private async verifyInitialConnectivity(): Promise<void> {
    const isActuallyOnline = await this.pingServer();

    if (isActuallyOnline) {
      this.status.isOnline = true;
      this.status.lastConnected = Date.now();
      setOffline(false);
    } else {
      this.status.isOnline = false;
      setOffline(true);
      this.startReconnectionAttempts();
    }

    markInitialized();
    this.notifyListeners(isActuallyOnline ? 'online' : 'offline');
  }

  /**
   * Set up browser online/offline event listeners.
   * NetworkMonitor is the ONLY system that should listen to these events.
   */
  private setupBrowserEvents(): void {
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }

  /**
   * Handle browser online event.
   * Verifies actual connectivity before updating state.
   */
  private handleBrowserOnline(): void {
    // Don't trust browser event alone - verify with server ping
    void this.verifyAndUpdateOnlineStatus();
  }

  /**
   * Handle browser offline event.
   * Immediately marks as offline since browser detected network loss.
   */
  private handleBrowserOffline(): void {
    this.setOfflineState();
  }

  /**
   * Verify server connectivity and update online status if reachable.
   * Used by browser online event and socket reconnection notifications.
   */
  private async verifyAndUpdateOnlineStatus(): Promise<void> {
    const isActuallyOnline = await this.pingServer();

    if (isActuallyOnline) {
      await this.setOnlineState();
    } else {
      logger.warn('Connection verification failed - still offline');
      this.setOfflineState();
    }
  }

  /**
   * Set state to online and notify listeners.
   * Consolidates all online state transitions.
   */
  private async setOnlineState(): Promise<void> {
    // Skip if already online
    if (this.status.isOnline) return;

    this.status.isOnline = true;
    this.status.lastConnected = Date.now();
    this.status.reconnectAttempts = 0;

    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Update shared state
    setOffline(false);

    // Refetch stale queries
    await this.queryClient.refetchQueries({ stale: true });

    // Single notification with fixed ID
    notifications.success('Connection restored', { id: 'connection-status' });

    this.notifyListeners('online');
    this.notifyListeners('reconnect-success');
  }

  /**
   * Set state to offline and start reconnection attempts.
   * Consolidates all offline state transitions.
   */
  private setOfflineState(): void {
    // Skip if already offline
    if (!this.status.isOnline) return;

    this.status.isOnline = false;
    this.status.isHighQuality = false;

    // Update shared state
    setOffline(true);

    // Start reconnection attempts
    this.startReconnectionAttempts();

    this.notifyListeners('offline');
  }

  /**
   * Notify monitor that socket has connected.
   * Called by SocketService when socket connection is established.
   * This helps keep NetworkMonitor in sync with actual connectivity.
   */
  public notifySocketConnected(): void {
    if (!this.status.isOnline) {
      // Socket connected while we thought we were offline - verify and update
      void this.verifyAndUpdateOnlineStatus();
    }
  }

  /**
   * Notify monitor that socket has disconnected.
   * Called by SocketService when socket connection is lost.
   */
  public notifySocketDisconnected(): void {
    // Socket disconnected - verify if we're actually offline
    void this.pingServer().then(isOnline => {
      if (!isOnline) {
        this.setOfflineState();
      }
    });
  }

  /**
   * Start intelligent reconnection attempts with exponential backoff.
   */
  private startReconnectionAttempts(): void {
    if (this.reconnectTimeout) return;

    const attemptReconnect = async () => {
      if (this.status.isOnline) return;

      this.status.reconnectAttempts++;
      this.notifyListeners('reconnect-attempt');

      const isOnline = await this.pingServer();

      if (isOnline) {
        await this.setOnlineState();
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
      const delay = Math.min(1000 * Math.pow(2, this.status.reconnectAttempts - 1), 30000);
      this.reconnectTimeout = setTimeout(attemptReconnect, delay);

      if (this.status.reconnectAttempts >= 10) {
        logger.error('Maximum reconnection attempts reached');
        this.notifyListeners('reconnect-failed');
        notifications.persistentError('Unable to reconnect. Please check your connection.');

        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      }
    };

    // First attempt after 1 second
    this.reconnectTimeout = setTimeout(attemptReconnect, 1000);
  }

  /**
   * Ping server health endpoint to verify actual connectivity.
   *
   * Uses "trust but verify" approach:
   * - If browser explicitly reports offline, trust it (skip ping)
   * - If browser reports online, verify with actual server ping
   */
  private async pingServer(): Promise<boolean> {
    // Trust browser's explicit offline signal - don't waste resources pinging
    if (!navigator.onLine) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const healthUrl = `${import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api'}/public/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic connection quality monitoring.
   */
  private startQualityMonitoring(): void {
    this.qualityCheckInterval = setInterval(() => {
      if (this.status.isOnline) {
        this.updateConnectionQuality();
      }
    }, 30000);
  }

  /**
   * Update connection quality metrics and adjust React Query behavior.
   */
  private updateConnectionQuality(): void {
    const quality = this.assessConnectionQuality();
    const wasHighQuality = this.status.isHighQuality;

    this.status.isHighQuality =
      quality === ConnectionQuality.EXCELLENT || quality === ConnectionQuality.GOOD;

    if (wasHighQuality !== this.status.isHighQuality) {
      this.adjustQueryClientForQuality();
      this.notifyListeners('quality-change');
    }
  }

  /**
   * Assess current connection quality using Network Information API.
   */
  private assessConnectionQuality(): ConnectionQuality {
    if (!this.status.isOnline) return ConnectionQuality.OFFLINE;

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

    return ConnectionQuality.GOOD;
  }

  /**
   * Adjust React Query settings based on connection quality.
   */
  private adjustQueryClientForQuality(): void {
    if (this.status.isHighQuality) {
      this.queryClient.setDefaultOptions({
        queries: { networkMode: 'online', retry: 3, staleTime: 5 * 60 * 1000 },
      });
    } else {
      this.queryClient.setDefaultOptions({
        queries: { networkMode: 'online', retry: 1, staleTime: 10 * 60 * 1000 },
      });
    }
  }

  /**
   * Set up Network Information API change listener.
   */
  private setupNetworkInformationAPI(): void {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        this.updateConnectionQuality();
      });
    }
  }

  /**
   * Start heartbeat to detect silent connection loss.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.status.isOnline) {
        const isStillOnline = await this.pingServer();
        if (!isStillOnline) {
          this.setOfflineState();
        }
      }
    }, 60000);
  }

  /**
   * Subscribe to network events.
   */
  public on(event: NetworkEvent, callback: (status: NetworkStatus) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from network events.
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
   * Notify all listeners of an event.
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
   * Get current network status snapshot.
   */
  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Manually trigger reconnection attempt.
   */
  public async retryConnection(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.status.reconnectAttempts = 0;

    const isOnline = await this.pingServer();
    if (isOnline) {
      await this.setOnlineState();
    } else {
      this.startReconnectionAttempts();
    }
  }

  /**
   * Cleanup all resources.
   */
  public destroy(): void {
    // Remove browser event listeners using stored references
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);

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

// =============================================================================
// Global Instance Management
// =============================================================================

let globalNetworkMonitor: NetworkMonitor | null = null;

/**
 * Initialize global network monitoring.
 * Should be called once during app bootstrap.
 */
export const initializeNetworkMonitor = (queryClient: QueryClient): NetworkMonitor => {
  if (!globalNetworkMonitor) {
    globalNetworkMonitor = new NetworkMonitor(queryClient);
  }
  return globalNetworkMonitor;
};

/**
 * Get global network monitor instance.
 */
export const getNetworkMonitor = (): NetworkMonitor | null => {
  return globalNetworkMonitor;
};

/**
 * Cleanup global network monitor.
 */
export const cleanupNetworkMonitor = (): void => {
  if (globalNetworkMonitor) {
    globalNetworkMonitor.destroy();
    globalNetworkMonitor = null;
  }
};

// =============================================================================
// React Hook
// =============================================================================

/**
 * React hook for network status monitoring.
 * Uses the global NetworkMonitor instance to avoid duplicate event listeners.
 */
export function useNetworkStatus(queryClient: QueryClient) {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isHighQuality: true,
    lastConnected: Date.now(),
    reconnectAttempts: 0,
  });

  // Use global monitor or initialize if needed
  const monitor = globalNetworkMonitor ?? initializeNetworkMonitor(queryClient);

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
