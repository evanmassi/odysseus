/**
 * Application Bootstrap Service
 *
 * Manages the ordered initialization sequence: auth check, session restore,
 * cache validation, network setup, and socket connection.
 */

import { authService } from '@domains/authentication/services/AuthService';
import { useAuthStore, sessionManager } from '@domains/authentication/stores/authStore';
import { useSearchStore } from '@domains/search/stores/searchStore';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { initializeNetworkMonitor, cleanupNetworkMonitor } from '@infra/connection/networkMonitor';
import { isOffline, resetNetworkState } from '@infra/connection/networkState';
import { initializeOptimisticUpdates } from '@infra/optimistic/optimisticUpdates';
import { initializeSocket, cleanupSocket } from '@infra/socket/SocketService';
import { logger } from '@shared/infrastructure/logger';

import { validateCacheVersion } from '../cache';
import { queryClient } from '../cache/queryClient';
import { queryKeys } from '../cache/queryKeys';

import { clearChunkReloadFlag } from './chunkErrorRecovery';
import { BOOTSTRAP_STEPS } from './constants';

import type { AppBootstrapState, BootstrapStep } from './types';
import type { QueryClient } from '@tanstack/react-query';

export class AppBootstrapService {
  private state: AppBootstrapState = {
    isLoading: true,
    currentStep: 'initialization',
    error: null,
    steps: [...BOOTSTRAP_STEPS],
    flags: {
      firstTimeSetupRequired: false,
      needsSystemAdmin: false,
    },
  };

  private listeners: Array<(state: AppBootstrapState) => void> = [];
  private isInitialized = false;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    this.authUnsubscribe = this.setupAuthSubscription();
  }

  subscribe(listener: (state: AppBootstrapState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): AppBootstrapState {
    return { ...this.state };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private updateStep(step: BootstrapStep, completed: boolean, error?: string) {
    this.state.currentStep = step;
    const stepIndex = this.state.steps.findIndex(s => s.step === step);
    if (stepIndex !== -1) {
      this.state.steps[stepIndex] = {
        ...this.state.steps[stepIndex],
        completed,
        error,
      };
    }
    if (error) {
      this.state.error = error;
      this.state.currentStep = 'error';
    }
    this.notify();
  }

  private setOfflineError() {
    this.state.currentStep = 'error';
    this.state.error = 'OFFLINE_DURING_INIT';
    this.state.isLoading = false;
    this.isInitialized = false;
    this.notify();
  }

  /**
   * Session Cleanup Subscription
   *
   * Resets domain UI stores on logout. Socket reconnection on login handled by useAuthSocketSync.
   */
  private setupAuthSubscription(): () => void {
    let wasAuthenticated = useAuthStore.getState().isAuthenticated;
    return useAuthStore.subscribe(state => {
      const isAuthenticated = state.isAuthenticated;

      if (wasAuthenticated && !isAuthenticated) {
        useTubeStore.getState().resetStore();
        useSearchStore.getState().clearSearch();

        // Clear presence cache to ensure fresh state on next login
        // This prevents stale online user badges from appearing
        queryClient.setQueryData(queryKeys.users.presence(), []);

        // Disconnect socket to trigger user_offline event on server
        // This notifies other clients that this user is no longer online
        cleanupSocket();
      }

      wasAuthenticated = isAuthenticated;
    });
  }

  async bootstrap(queryClient: QueryClient): Promise<void> {
    // GUARD: Prevent duplicate bootstrap in React StrictMode
    if (this.isInitialized) {
      logger.warn('Bootstrap already initialized, skipping duplicate');
      return;
    }

    try {
      this.state.isLoading = true;
      this.state.error = null;
      this.notify();

      this.updateStep('initialization', false);
      // Brief delay to let the loading screen render before heavier initialization work begins.
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateStep('initialization', true);

      // Check auth - detect first-time setup and system admin status
      this.updateStep('auth-check', false);
      try {
        const firstTimeResult = await authService.checkFirstTime();

        this.state.flags.firstTimeSetupRequired = firstTimeResult.isFirstTime;
        this.state.flags.needsSystemAdmin = firstTimeResult.needsSystemAdmin;

        this.updateStep('auth-check', true);
      } catch (error) {
        logger.error('Bootstrap auth check failed', { error });
        this.updateStep('auth-check', false, 'Failed to check authentication status');
        throw error;
      }

      // Restore session from SessionService
      // SessionService already loaded tokens in constructor, now sync with auth store
      this.updateStep('session-restore', false);
      try {
        const authStore = useAuthStore.getState();
        authStore.initializeFromStorage();
        this.updateStep('session-restore', true);
      } catch (error) {
        logger.error('Bootstrap session restoration failed', { error });
        // Non-fatal: Continue bootstrap even if session restoration fails
        // User will simply need to log in again
        this.updateStep('session-restore', true);
      }

      // Validate cached data against server version
      // Clears stale cache if database was reset or version mismatch detected
      this.updateStep('cache-validation', false);
      try {
        const tokens = sessionManager.getTokens();
        const accessToken = tokens?.accessToken ?? null;
        const result = await validateCacheVersion(accessToken);

        if (!result.isValid) {
          logger.info('Cache invalidated due to version mismatch', {
            serverVersion: result.serverVersion,
            cachedVersion: result.cachedVersion,
          });
        }
        this.updateStep('cache-validation', true);
      } catch (error) {
        logger.warn('Cache validation failed, continuing with existing cache', { error });
        // Non-fatal: Continue even if validation fails
        this.updateStep('cache-validation', true);
      }

      this.updateStep('socket-connection', false);

      // Early offline detection - check before attempting network operations
      if (!navigator.onLine) {
        logger.warn('Browser reports offline state during bootstrap');
        this.setOfflineError();
        return;
      }

      try {
        // Initialize network monitoring first and wait for connectivity verification
        // This ensures NetworkMonitor is ready before socket starts connecting
        const networkMonitor = initializeNetworkMonitor(queryClient);
        await networkMonitor.waitForInitialization();

        if (isOffline()) {
          logger.warn('Network monitor detected offline state during bootstrap');
          this.setOfflineError();
          return;
        }

        initializeOptimisticUpdates(queryClient);

        // Socket will notify NetworkMonitor of connection state changes
        await initializeSocket(queryClient);

        this.updateStep('socket-connection', true);
      } catch (socketError) {
        // Check if this is an offline-related error
        const errorMessage =
          socketError instanceof Error ? socketError.message : String(socketError);
        const isOfflineError =
          errorMessage.includes('xhr poll error') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          !navigator.onLine;

        if (isOfflineError) {
          logger.warn('Offline-related error during bootstrap', { socketError });
          this.setOfflineError();
          return;
        }

        logger.error('Bootstrap real-time systems initialization failed', { socketError });
        this.updateStep('socket-connection', false, 'Failed to initialize real-time systems');
        throw socketError;
      }

      // Data loading handled by React Query (on-demand, component-driven)
      // Components call hooks (useTubesQuery, useResearchersQuery, etc.)
      // Socket.IO keeps cache fresh via real-time invalidation
      this.updateStep('data-loading', true);

      this.updateStep('complete', true);
      this.state.isLoading = false;
      this.isInitialized = true;

      // Clear chunk reload flag after successful bootstrap
      // This allows future chunk errors to trigger a reload
      clearChunkReloadFlag();

      this.notify();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bootstrap failed';
      this.updateStep('error', false, errorMessage);
      this.state.isLoading = false;
      this.isInitialized = false; // Allow retry after error
    }
  }

  public cleanup(): void {
    cleanupSocket();
    cleanupNetworkMonitor();
    this.authUnsubscribe?.();
    this.authUnsubscribe = null;
    this.isInitialized = false;
  }

  retry(queryClient: QueryClient): void {
    this.state.steps = this.state.steps.map(step => ({
      ...step,
      completed: false,
      error: undefined,
    }));

    // Reset network state so we get fresh connectivity check on retry
    resetNetworkState();
    cleanupNetworkMonitor();

    this.isInitialized = false;
    void this.bootstrap(queryClient);
  }
}

export const appBootstrapService = new AppBootstrapService();
