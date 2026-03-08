/**
 * Socket Service
 *
 * Socket connection management with lifecycle handling and query cache bridge integration.
 */

import { io } from 'socket.io-client';

import { sessionManager } from '@domains/authentication/stores/authStore';
import { logger } from '@shared/infrastructure/logger';

import { getSocketBridge, cleanupSocketBridge } from './SocketQueryBridge';

import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

const SOCKET_CONFIG = {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
  url: import.meta.env['VITE_SOCKET_URL'] || 'http://localhost:3001',
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
      // Auth token enables server-side presence tracking
      const authToken = await sessionManager.getValidAccessToken();

      this.socket = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG.options,
        auth: authToken ? { token: authToken } : undefined,
      });

      const bridge = getSocketBridge(this.queryClient);
      bridge.initializeSocket(this.socket);

      await this.waitForConnection();
      this.isInitialized = true;
    } catch (error) {
      logger.error('Socket service failed to initialize', { error });
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

  /** Refreshes auth token before reconnecting to maintain presence tracking. */
  public async reconnect(): Promise<void> {
    if (!this.socket) {
      await this.initialize();
      return;
    }

    if (!this.socket.connected) {
      const authToken = await sessionManager.getValidAccessToken();
      if (authToken) {
        this.socket.auth = { token: authToken };
      }

      this.socket.connect();
      await this.waitForConnection();
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

// Global Instance Management

let globalSocketService: SocketService | null = null;

const getSocketService = (queryClient: QueryClient): SocketService => {
  if (!globalSocketService) {
    globalSocketService = new SocketService(queryClient);
  }
  return globalSocketService;
};

export const initializeSocket = async (queryClient: QueryClient): Promise<SocketService> => {
  const service = getSocketService(queryClient);
  await service.initialize();
  return service;
};

export const cleanupSocket = (): void => {
  if (globalSocketService) {
    globalSocketService.disconnect();
    globalSocketService = null;
  }
};
