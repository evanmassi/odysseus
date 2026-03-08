/**
 * Network Connection Monitor
 *
 * Monitors actual server reachability (not just browser online/offline) with exponential backoff reconnection.
 */

import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import { setOffline } from './networkState';

import type { NavigatorWithConnection } from '@shared/types';
import type { QueryClient } from '@tanstack/react-query';

export interface NetworkStatus {
  isOnline: boolean;
  isHighQuality: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  lastConnected: number;
  reconnectAttempts: number;
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent', // > 10 Mbps, < 100ms RTT
  GOOD = 'good', // > 1 Mbps, < 300ms RTT
  FAIR = 'fair', // > 0.5 Mbps, < 1000ms RTT
  POOR = 'poor', // < 0.5 Mbps, > 1000ms RTT
  OFFLINE = 'offline',
}

export type NetworkEvent =
  | 'online'
  | 'offline'
  | 'quality-change'
  | 'reconnect-attempt'
  | 'reconnect-success'
  | 'reconnect-failed';

export class NetworkMonitor {
  private queryClient: QueryClient;
  private status: NetworkStatus;
  private listeners: Map<NetworkEvent, Array<(status: NetworkStatus) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private qualityCheckInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<void> | null = null;

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

    this.boundHandleOnline = this.handleBrowserOnline.bind(this);
    this.boundHandleOffline = this.handleBrowserOffline.bind(this);

    setOffline(!navigator.onLine);

    this.setupBrowserEvents();
    this.startHeartbeat();
    this.startQualityMonitoring();
    this.setupNetworkInformationAPI();

    this.initializationPromise = this.verifyInitialConnectivity();
  }

  /** Call before starting socket connections to ensure proper initialization order. */
  public async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

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

    this.notifyListeners(isActuallyOnline ? 'online' : 'offline');
  }

  private setupBrowserEvents(): void {
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }

  private handleBrowserOnline(): void {
    void this.verifyAndUpdateOnlineStatus();
  }

  private handleBrowserOffline(): void {
    this.setOfflineState();
  }

  private async verifyAndUpdateOnlineStatus(): Promise<void> {
    const isActuallyOnline = await this.pingServer();

    if (isActuallyOnline) {
      await this.setOnlineState();
    } else {
      logger.warn('Connection verification failed - still offline');
      this.setOfflineState();
    }
  }

  private async setOnlineState(): Promise<void> {
    if (this.status.isOnline) return;

    this.status.isOnline = true;
    this.status.lastConnected = Date.now();
    this.status.reconnectAttempts = 0;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    setOffline(false);

    await this.queryClient.refetchQueries({ stale: true });
    notifications.success('Connection restored', { id: 'connection-status' });

    this.notifyListeners('online');
    this.notifyListeners('reconnect-success');
  }

  private setOfflineState(): void {
    if (!this.status.isOnline) return;

    this.status.isOnline = false;
    this.status.isHighQuality = false;

    setOffline(true);
    this.startReconnectionAttempts();

    this.notifyListeners('offline');
  }

  public notifySocketConnected(): void {
    if (!this.status.isOnline) {
      void this.verifyAndUpdateOnlineStatus();
    }
  }

  public notifySocketDisconnected(): void {
    void this.pingServer().then(isOnline => {
      if (!isOnline) {
        this.setOfflineState();
      }
    });
  }

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

    this.reconnectTimeout = setTimeout(attemptReconnect, 1000);
  }

  // Trust browser's explicit offline signal; only ping when browser says online
  private async pingServer(): Promise<boolean> {
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

  private startQualityMonitoring(): void {
    this.qualityCheckInterval = setInterval(() => {
      if (this.status.isOnline) {
        this.updateConnectionQuality();
      }
    }, 30000);
  }

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

  private setupNetworkInformationAPI(): void {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        this.updateConnectionQuality();
      });
    }
  }

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

  public on(event: NetworkEvent, callback: (status: NetworkStatus) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: NetworkEvent, callback: (status: NetworkStatus) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

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

  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

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

  public destroy(): void {
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

// Global Instance Management

let globalNetworkMonitor: NetworkMonitor | null = null;

export const initializeNetworkMonitor = (queryClient: QueryClient): NetworkMonitor => {
  if (!globalNetworkMonitor) {
    globalNetworkMonitor = new NetworkMonitor(queryClient);
  }
  return globalNetworkMonitor;
};

export const getNetworkMonitor = (): NetworkMonitor | null => {
  return globalNetworkMonitor;
};

export const cleanupNetworkMonitor = (): void => {
  if (globalNetworkMonitor) {
    globalNetworkMonitor.destroy();
    globalNetworkMonitor = null;
  }
};
