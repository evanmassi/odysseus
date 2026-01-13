/**
 * Socket Service
 *
 * Socket connection management with proper lifecycle handling.
 * Integrates with the Socket → Query Cache Bridge for real-time updates.
 */

import { io } from 'socket.io-client';

import { sessionManager } from '@domains/authentication/stores/authStore';
import { logger } from '@shared/infrastructure/logger';

import { getSocketBridge, cleanupSocketBridge } from './queryBridge';

import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

/**
 * Socket connection configuration
 */
const SOCKET_CONFIG = {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string URL is invalid, must fallback
  url: import.meta.env['VITE_SOCKET_URL'] || 'http://localhost:3001',
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 5,
    timeout: 20000,
    forceNew: true,
  },
} as const;

/**
 * Socket Service Class
 *
 * Manages socket lifecycle and integrates with React Query cache
 */
export class SocketService {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isInitialized = false;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Initialize socket connection with bridge integration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Socket service already initialized, skipping');
      return;
    }

    try {
      // Get valid auth token for socket authentication (enables presence tracking)
      // Uses getValidAccessToken() which auto-refreshes if token is expired
      const authToken = await sessionManager.getValidAccessToken();

      logger.debug('Socket initializing', { hasToken: !!authToken });

      // Create socket connection with auth token
      this.socket = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG.options,
        auth: authToken ? { token: authToken } : undefined,
      });

      // Initialize the socket bridge for cache management
      const bridge = getSocketBridge(this.queryClient);
      bridge.initializeSocket(this.socket);

      // Wait for connection
      await this.waitForConnection();

      this.isInitialized = true;
    } catch (error) {
      logger.error('Socket service failed to initialize', { error });
      throw error;
    }
  }

  /**
   * Disconnect socket and cleanup
   */
  public disconnect(): void {
    if (this.socket) {
      // Cleanup bridge first
      cleanupSocketBridge();

      // Disconnect socket
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get current socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Check if service is initialized
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Reconnect socket if disconnected
   * Refreshes auth token to ensure presence tracking works after token refresh
   */
  public async reconnect(): Promise<void> {
    if (!this.socket) {
      await this.initialize();
      return;
    }

    if (!this.socket.connected) {
      // Get valid auth token before reconnecting (auto-refreshes if expired)
      const authToken = await sessionManager.getValidAccessToken();
      if (authToken) {
        this.socket.auth = { token: authToken };
      }

      this.socket.connect();
      await this.waitForConnection();
    }
  }

  /**
   * Wait for socket connection to establish
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      // Already connected
      if (this.socket.connected) {
        resolve();
        return;
      }

      // Set up connection handlers
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

      // Set up temporary listeners
      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);

      // Set timeout
      const timeoutId = setTimeout(onTimeout, SOCKET_CONFIG.options.timeout);
    });
  }
}

/**
 * Global socket service instance
 * Singleton pattern for consistent socket management across the app
 */
let globalSocketService: SocketService | null = null;

/**
 * Get or create global socket service instance
 */
export const getSocketService = (queryClient: QueryClient): SocketService => {
  if (!globalSocketService) {
    globalSocketService = new SocketService(queryClient);
  }
  return globalSocketService;
};

/**
 * Initialize global socket service
 */
export const initializeSocket = async (queryClient: QueryClient): Promise<SocketService> => {
  const service = getSocketService(queryClient);
  await service.initialize();
  return service;
};

/**
 * Cleanup global socket service
 */
export const cleanupSocket = (): void => {
  if (globalSocketService) {
    globalSocketService.disconnect();
    globalSocketService = null;
  }
};
