/**
 * Network Monitor Tests
 *
 * Tests network status detection, server ping, and connection quality monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  NetworkMonitor,
  ConnectionQuality,
  initializeNetworkMonitor,
  getNetworkMonitor,
  cleanupNetworkMonitor,
} from './networkMonitor';

// Mock network state module
const mockSetOffline = vi.fn();
const mockMarkInitialized = vi.fn();
vi.mock('./networkState', () => ({
  setOffline: (value: boolean) => mockSetOffline(value),
  markInitialized: () => mockMarkInitialized(),
}));

// Mock logger
vi.mock('@shared/infrastructure/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock notifications
vi.mock('@shared/utils/notifications', () => ({
  notifications: {
    success: vi.fn(),
    persistentError: vi.fn(),
  },
}));

describe('NetworkMonitor', () => {
  let mockQueryClient: {
    refetchQueries: ReturnType<typeof vi.fn>;
    setDefaultOptions: ReturnType<typeof vi.fn>;
  };
  let originalFetch: typeof global.fetch;
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalNavigator = global.navigator;

    mockQueryClient = {
      refetchQueries: vi.fn().mockResolvedValue(undefined),
      setDefaultOptions: vi.fn(),
    };

    // Default to online state
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    // Mock successful fetch by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    // Clean up any existing global monitor
    cleanupNetworkMonitor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupNetworkMonitor();
    global.fetch = originalFetch;
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create monitor instance', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      expect(monitor).toBeInstanceOf(NetworkMonitor);

      monitor.destroy();
    });

    it('should have initial status', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);
      const status = monitor.getStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isHighQuality');
      expect(status).toHaveProperty('lastConnected');
      expect(status).toHaveProperty('reconnectAttempts');

      monitor.destroy();
    });

    it('should call setOffline based on navigator status', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      // Should be called during initialization
      expect(mockSetOffline).toHaveBeenCalled();

      monitor.destroy();
    });
  });

  describe('Event Listeners', () => {
    it('should subscribe and unsubscribe from events', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);
      const callback = vi.fn();

      monitor.on('online', callback);
      monitor.off('online', callback);

      // No error thrown means success
      monitor.destroy();
    });
  });

  describe('Socket Notifications', () => {
    it('should handle socket connected notification', async () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      // Should not throw
      monitor.notifySocketConnected();

      monitor.destroy();
    });

    it('should handle socket disconnected notification', async () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      // Should not throw
      monitor.notifySocketDisconnected();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      monitor.destroy();
    });
  });

  describe('getStatus()', () => {
    it('should return status snapshot', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);
      const status = monitor.getStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isHighQuality');
      expect(status).toHaveProperty('lastConnected');
      expect(status).toHaveProperty('reconnectAttempts');

      monitor.destroy();
    });

    it('should return copy of status (immutable)', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      const status1 = monitor.getStatus();
      const status2 = monitor.getStatus();

      expect(status1).not.toBe(status2);
      expect(status1.isOnline).toBe(status2.isOnline);

      monitor.destroy();
    });
  });

  describe('destroy()', () => {
    it('should cleanup resources', () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      monitor.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Global Instance Management', () => {
    it('should initialize global monitor', () => {
      const globalMonitor = initializeNetworkMonitor(mockQueryClient as never);

      expect(globalMonitor).toBeInstanceOf(NetworkMonitor);
      expect(getNetworkMonitor()).toBe(globalMonitor);

      cleanupNetworkMonitor();
    });

    it('should return same instance on multiple init calls', () => {
      const first = initializeNetworkMonitor(mockQueryClient as never);
      const second = initializeNetworkMonitor(mockQueryClient as never);

      expect(first).toBe(second);

      cleanupNetworkMonitor();
    });

    it('should cleanup global monitor', () => {
      initializeNetworkMonitor(mockQueryClient as never);

      cleanupNetworkMonitor();

      expect(getNetworkMonitor()).toBeNull();
    });
  });

  describe('ConnectionQuality enum', () => {
    it('should have correct values', () => {
      expect(ConnectionQuality.EXCELLENT).toBe('excellent');
      expect(ConnectionQuality.GOOD).toBe('good');
      expect(ConnectionQuality.FAIR).toBe('fair');
      expect(ConnectionQuality.POOR).toBe('poor');
      expect(ConnectionQuality.OFFLINE).toBe('offline');
    });
  });

  describe('retryConnection()', () => {
    it('should call pingServer', async () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      vi.mocked(global.fetch).mockClear();

      await monitor.retryConnection();

      expect(global.fetch).toHaveBeenCalled();

      monitor.destroy();
    });
  });

  describe('waitForInitialization()', () => {
    it('should resolve initialization promise', async () => {
      const monitor = new NetworkMonitor(mockQueryClient as never);

      // Should resolve without throwing
      await expect(monitor.waitForInitialization()).resolves.toBeUndefined();

      monitor.destroy();
    });
  });
});
