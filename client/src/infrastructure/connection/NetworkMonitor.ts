/**
 * Network Connection Monitor
 *
 * Monitors actual server reachability (not just browser online/offline) with exponential backoff reconnection.
 */

import { logger } from '@infra/logger';
import { env } from '@shared/config';
import { notifications } from '@shared/utils/notifications';

import { setOffline } from './networkState';

import type { QueryClient } from '@tanstack/react-query';

export interface NetworkStatus {
  isOnline: boolean;
  lastConnected: number;
  reconnectAttempts: number;
}

export type NetworkEvent =
  | 'online'
  | 'offline'
  | 'reconnect-attempt'
  | 'reconnect-success'
  | 'reconnect-failed';

const HEARTBEAT_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_BACKOFF_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

export class NetworkMonitor {
  private queryClient: QueryClient;
  private status: NetworkStatus;
  private listeners: Map<NetworkEvent, Array<(status: NetworkStatus) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<void> | null = null;

  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.status = {
      isOnline: navigator.onLine,
      lastConnected: Date.now(),
      reconnectAttempts: 0,
    };

    this.boundHandleOnline = this.handleBrowserOnline.bind(this);
    this.boundHandleOffline = this.handleBrowserOffline.bind(this);

    setOffline(!navigator.onLine);

    this.setupBrowserEvents();
    this.startHeartbeat();

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
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, this.status.reconnectAttempts - 1),
        MAX_BACKOFF_MS
      );
      this.reconnectTimeout = setTimeout(attemptReconnect, delay);

      if (this.status.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error('Maximum reconnection attempts reached');
        this.notifyListeners('reconnect-failed');
        notifications.persistentError('Unable to reconnect. Please check your connection.');

        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      }
    };

    this.reconnectTimeout = setTimeout(attemptReconnect, BASE_RECONNECT_DELAY_MS);
  }

  // Trust browser's explicit offline signal; only ping when browser says online
  private async pingServer(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const healthUrl = `${env.apiBaseUrl()}/public/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
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
    }, HEARTBEAT_INTERVAL_MS);
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

    this.listeners.clear();
  }
}

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
