/**
 * Socket Service
 *
 * Socket connection management with lifecycle handling and query cache bridge integration.
 */

import { io } from 'socket.io-client';

import { sessionManager, useAuthStore } from '@domains/authentication';
import { StorageService } from '@domains/storage';
import { logger } from '@infra/logger';
import { env } from '@shared/config';

import { getSocketBridge, cleanupSocketBridge } from './SocketQueryBridge';

import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

const SOCKET_CONFIG = {
  url: env.socketUrl(),
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
  },
} as const;

class SocketService {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isInitialized = false;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Socket service already initialized, skipping');
      return;
    }

    try {
      this.socket = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG.options,
        // Resolved per (re)connection so reconnects use a fresh, auto-refreshed token.
        auth: (cb: (data: Record<string, string>) => void) => {
          void sessionManager.getValidAccessToken().then(token => {
            cb(token ? { token } : {});
          });
        },
      });

      const labId = useAuthStore.getState().user?.labId;
      const bridge = getSocketBridge(this.queryClient, labId, () =>
        StorageService.getConfigVersion()
      );
      bridge.initializeSocket(this.socket);

      await this.waitForConnection();
      this.isInitialized = true;
    } catch (error) {
      logger.error('Socket service failed to initialize', { error });
      // Tear down partial state so a retry starts clean, not bound to an orphaned socket.
      this.disconnect();
      throw error;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      cleanupSocketBridge();
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      if (this.socket.connected) {
        resolve();
        return;
      }

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onTimeout = () => {
        cleanup();
        reject(new Error('Socket connection timeout'));
      };

      const cleanup = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        clearTimeout(timeoutId);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);

      const timeoutId = setTimeout(onTimeout, SOCKET_CONFIG.options.timeout);
    });
  }
}

let globalSocketService: SocketService | null = null;

export const initializeSocket = async (queryClient: QueryClient): Promise<SocketService> => {
  if (!globalSocketService) {
    globalSocketService = new SocketService(queryClient);
  }
  await globalSocketService.initialize();
  return globalSocketService;
};

export const cleanupSocket = (): void => {
  if (globalSocketService) {
    globalSocketService.disconnect();
    globalSocketService = null;
  }
};
